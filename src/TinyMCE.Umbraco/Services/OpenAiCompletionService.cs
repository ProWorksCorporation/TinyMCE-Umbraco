using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Security;
using Categories = TinyMCE.Umbraco.Services.TinyMceAiConstants.ErrorCategories;

namespace TinyMCE.Umbraco.Services;

/// <summary>
///     <see cref="ITinyMceAiCompletionService"/> backed by OpenAI's Chat Completions API, using
///     <c>TinyMceConfig:openAiApikey</c> and <c>TinyMceConfig:OpenAiApiConfig</c>.
/// </summary>
/// <remarks>
///     <para>
///         The request has the shape the browser used to send before CL-001: the user message, then the developer
///         message if one is configured, with <c>model</c>, <c>temperature</c> and <c>max_completion_tokens</c>.
///     </para>
///     <para>
///         Each call writes exactly one log entry for attribution: <c>Information</c> on success, <c>Warning</c> on
///         failure, with the user's key, the outcome, the duration and, on failure, the error category. The prompt, the
///         completion, the provider's response body and the key are never logged at any level. A call cancelled by the
///         caller writes no entry.
///     </para>
/// </remarks>
public sealed class OpenAiCompletionService : ITinyMceAiCompletionService
{
    private const string SuccessTemplate = "TinyMCE AI completion {Outcome} for user {UserKey} in {DurationMs} ms";
    private const string FailureTemplate = SuccessTemplate + " ({ErrorCategory})";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<TinyMceConfig> _tinyMceConfig;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
    private readonly ILogger<OpenAiCompletionService> _logger;

    /// <summary>Initializes a new instance of the <see cref="OpenAiCompletionService"/> class.</summary>
    public OpenAiCompletionService(
        IHttpClientFactory httpClientFactory,
        IOptions<TinyMceConfig> tinyMceConfig,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
        ILogger<OpenAiCompletionService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _tinyMceConfig = tinyMceConfig;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TinyMceAiCompletionResult> CompleteAsync(string prompt, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        Guid? userKey = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key;
        TinyMceConfig config = _tinyMceConfig.Value;

        if (string.IsNullOrWhiteSpace(config.openAiApikey))
        {
            LogFailure(userKey, stopwatch, Categories.NotConfigured);
            return TinyMceAiCompletionResult.NotConfiguredResult();
        }

        string? content;
        string? errorCategory;
        try
        {
            using HttpRequestMessage request = CreateRequest(prompt, config);
            HttpClient client = _httpClientFactory.CreateClient(TinyMceAiConstants.HttpClientName);
            using HttpResponseMessage response = await client.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                content = await ReadCompletionAsync(response, cancellationToken);
                errorCategory = content is null ? Categories.Unknown : null;
            }
            else
            {
                content = null;
                errorCategory = await CategorizeFailureAsync(response, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The editor aborted the request; the upstream call has been cancelled with it.
            throw;
        }
        catch (TaskCanceledException)
        {
            // Cancelled without the caller asking: HttpClient's own timeout elapsed.
            content = null;
            errorCategory = Categories.Timeout;
        }
        catch (HttpRequestException)
        {
            content = null;
            errorCategory = Categories.Unavailable;
        }

        if (errorCategory is not null)
        {
            LogFailure(userKey, stopwatch, errorCategory);
            return TinyMceAiCompletionResult.Failure(errorCategory);
        }

        _logger.LogInformation(SuccessTemplate, "Succeeded", userKey, stopwatch.ElapsedMilliseconds);
        return TinyMceAiCompletionResult.Success(content!);
    }

    private static HttpRequestMessage CreateRequest(string prompt, TinyMceConfig config)
    {
        OpenAiApiConfig options = config.OpenAiApiConfig ?? new OpenAiApiConfig();

        var messages = new List<ChatMessage> { new("user", prompt) };
        if (!string.IsNullOrEmpty(options.developerMessage))
        {
            messages.Add(new ChatMessage("developer", options.developerMessage));
        }

        var body = new ChatCompletionRequest(options.model, options.temperature, options.maxCompletionTokens, messages);

        var request = new HttpRequestMessage(HttpMethod.Post, TinyMceAiConstants.OpenAiChatCompletionsUrl)
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.openAiApikey);
        return request;
    }

    /// <summary>The trimmed first choice; <c>""</c> when it has no content; <c>null</c> when the body is not a completion.</summary>
    private static async Task<string?> ReadCompletionAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            using JsonDocument document = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken),
                cancellationToken: cancellationToken);

            if (!document.RootElement.TryGetProperty("choices", out JsonElement choices)
                || choices.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            JsonElement first = choices.EnumerateArray().FirstOrDefault();
            return first.ValueKind == JsonValueKind.Object
                   && first.TryGetProperty("message", out JsonElement message)
                   && message.ValueKind == JsonValueKind.Object
                   && message.TryGetProperty("content", out JsonElement text)
                   && text.ValueKind == JsonValueKind.String
                ? text.GetString()!.Trim()
                : "";
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Maps a non-success response to a category (data-model §3). The body is read only for <c>error.code</c>.</summary>
    private static async Task<string> CategorizeFailureAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        switch (response.StatusCode)
        {
            case HttpStatusCode.Unauthorized:
            case HttpStatusCode.Forbidden:
                return Categories.Authentication;

            case HttpStatusCode.TooManyRequests:
                return await ReadErrorCodeAsync(response, cancellationToken) == "insufficient_quota"
                    ? Categories.QuotaExceeded
                    : Categories.RateLimited;

            case HttpStatusCode.BadRequest:
            case HttpStatusCode.NotFound:
            case HttpStatusCode.UnprocessableEntity:
                return Categories.InvalidRequest;

            default:
                return (int)response.StatusCode >= 500 ? Categories.Unavailable : Categories.Unknown;
        }
    }

    private static async Task<string?> ReadErrorCodeAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            using JsonDocument document = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken),
                cancellationToken: cancellationToken);

            return document.RootElement.TryGetProperty("error", out JsonElement error)
                   && error.ValueKind == JsonValueKind.Object
                   && error.TryGetProperty("code", out JsonElement code)
                   && code.ValueKind == JsonValueKind.String
                ? code.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private void LogFailure(Guid? userKey, Stopwatch stopwatch, string errorCategory) =>
        _logger.LogWarning(FailureTemplate, "Failed", userKey, stopwatch.ElapsedMilliseconds, errorCategory);

    private sealed record ChatMessage(
        [property: System.Text.Json.Serialization.JsonPropertyName("role")] string Role,
        [property: System.Text.Json.Serialization.JsonPropertyName("content")] string Content);

    private sealed record ChatCompletionRequest(
        [property: System.Text.Json.Serialization.JsonPropertyName("model")] string Model,
        [property: System.Text.Json.Serialization.JsonPropertyName("temperature")] double Temperature,
        [property: System.Text.Json.Serialization.JsonPropertyName("max_completion_tokens")] int MaxCompletionTokens,
        [property: System.Text.Json.Serialization.JsonPropertyName("messages")] IReadOnlyList<ChatMessage> Messages);
}
