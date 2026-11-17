using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using TinyMCE.Umbraco.Services;
using TinyMCE.Umbraco.Tests.Infrastructure;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Categories = TinyMCE.Umbraco.Services.TinyMceAiConstants.ErrorCategories;

namespace TinyMCE.Umbraco.Tests.Unit;

/// <summary>
///     Unit tests for <see cref="OpenAiCompletionService"/>: what it sends to OpenAI, how it maps every failure to a
///     category (data-model §3), and that its single log entry per call never carries the prompt, the completion, the
///     key or provider text (data-model §4, C-AI-7).
/// </summary>
[TestFixture]
public class OpenAiCompletionServiceTests
{
    /// <summary>A recognisable stand-in for an OpenAI key; it must never appear in a log entry.</summary>
    internal const string SentinelKey = "sk-test-SECRET-4d1f";

    /// <summary>
    ///     What OpenAI really answers to a bad key: its message echoes a masked fragment of the key, which is why
    ///     provider text is never passed on (research R9).
    /// </summary>
    internal const string ProviderErrorMessage = "Incorrect API key provided: sk-tes***4d1f";

    internal const string Prompt = "PROMPT-TEXT-7c2e Rewrite this paragraph";
    internal const string Completion = "COMPLETION-TEXT-91ab The rewritten paragraph.";

    internal const string SuccessTemplate = "TinyMCE AI completion {Outcome} for user {UserKey} in {DurationMs} ms";
    internal const string FailureTemplate = SuccessTemplate + " ({ErrorCategory})";

    private static readonly Guid _userKey = Guid.Parse("5f2c1a3e-0d4b-4c8e-9a71-2b6d8e0f4c11");

    private StubOpenAiHandler _stub = null!;
    private CapturingLogger<OpenAiCompletionService> _logger = null!;

    [SetUp]
    public void SetUp()
    {
        _stub = new StubOpenAiHandler();
        _logger = new CapturingLogger<OpenAiCompletionService>();
    }

    [TearDown]
    public void TearDown() => _stub.Dispose();

    private OpenAiCompletionService CreateService(string apiKey = SentinelKey, string developerMessage = "")
    {
        var config = new TinyMceConfig
        {
            openAiApikey = apiKey,
            OpenAiApiConfig = new OpenAiApiConfig
            {
                model = "gpt-test-model",
                temperature = 0.25,
                maxCompletionTokens = 321,
                developerMessage = developerMessage,
            },
        };

        var user = new Mock<IUser>();
        user.SetupGet(u => u.Key).Returns(_userKey);
        var security = new Mock<IBackOfficeSecurity>();
        security.SetupGet(s => s.CurrentUser).Returns(user.Object);
        var accessor = new Mock<IBackOfficeSecurityAccessor>();
        accessor.SetupGet(a => a.BackOfficeSecurity).Returns(security.Object);

        return new OpenAiCompletionService(
            new StubHttpClientFactory(_stub),
            Options.Create(config),
            accessor.Object,
            _logger);
    }

    /// <summary>Returns a client over the stub; the client never disposes the stub, which the fixture owns.</summary>
    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            Assert.That(name, Is.EqualTo(TinyMceAiConstants.HttpClientName));
            return new HttpClient(handler, disposeHandler: false);
        }
    }

    // ---- Not configured ----

    [TestCase("")]
    [TestCase("   ")]
    public async Task NotConfigured_ReturnsNotConfigured_WithoutCallingTheProvider(string apiKey)
    {
        TinyMceAiCompletionResult result = await CreateService(apiKey).CompleteAsync(Prompt, CancellationToken.None);

        Assert.That(result.NotConfigured, Is.True);
        Assert.That(result.Succeeded, Is.False);
        Assert.That(_stub.CallCount, Is.EqualTo(0));
        AssertSingleFailureLogEntry(Categories.NotConfigured);
    }

    // ---- Request ----

    [Test]
    public async Task Request_PostsToChatCompletions_WithBearerKey_AndTheConfiguredOptions()
    {
        _stub.RespondWithCompletion(Completion);

        await CreateService().CompleteAsync(Prompt, CancellationToken.None);

        Assert.That(_stub.CallCount, Is.EqualTo(1));
        StubOpenAiHandler.RecordedRequest request = _stub.Requests[0];
        Assert.That(request.Method, Is.EqualTo(HttpMethod.Post));
        Assert.That(request.Uri, Is.EqualTo(new Uri(TinyMceAiConstants.OpenAiChatCompletionsUrl)));
        Assert.That(request.Headers["Authorization"], Is.EqualTo($"Bearer {SentinelKey}"));

        JsonElement body = JsonDocument.Parse(request.Body).RootElement;
        Assert.That(body.GetProperty("model").GetString(), Is.EqualTo("gpt-test-model"));
        Assert.That(body.GetProperty("temperature").GetDouble(), Is.EqualTo(0.25));
        Assert.That(body.GetProperty("max_completion_tokens").GetInt32(), Is.EqualTo(321));
    }

    [Test]
    public async Task Request_WithoutDeveloperMessage_SendsOnlyTheUserMessage()
    {
        _stub.RespondWithCompletion(Completion);

        await CreateService().CompleteAsync(Prompt, CancellationToken.None);

        JsonElement[] messages = Messages(_stub.Requests[0]);
        Assert.That(messages, Has.Length.EqualTo(1));
        Assert.That(messages[0].GetProperty("role").GetString(), Is.EqualTo("user"));
        Assert.That(messages[0].GetProperty("content").GetString(), Is.EqualTo(Prompt));
    }

    /// <summary>The user message comes first, then the developer message: the order the browser used before CL-001.</summary>
    [Test]
    public async Task Request_WithDeveloperMessage_SendsUserThenDeveloper()
    {
        _stub.RespondWithCompletion(Completion);

        await CreateService(developerMessage: "Answer in British English.").CompleteAsync(Prompt, CancellationToken.None);

        JsonElement[] messages = Messages(_stub.Requests[0]);
        Assert.That(messages, Has.Length.EqualTo(2));
        Assert.That(messages[0].GetProperty("role").GetString(), Is.EqualTo("user"));
        Assert.That(messages[0].GetProperty("content").GetString(), Is.EqualTo(Prompt));
        Assert.That(messages[1].GetProperty("role").GetString(), Is.EqualTo("developer"));
        Assert.That(messages[1].GetProperty("content").GetString(), Is.EqualTo("Answer in British English."));
    }

    private static JsonElement[] Messages(StubOpenAiHandler.RecordedRequest request) =>
        JsonDocument.Parse(request.Body).RootElement.GetProperty("messages").EnumerateArray().ToArray();

    // ---- Success ----

    [Test]
    public async Task Success_ReturnsTheFirstChoice_Trimmed()
    {
        _stub.RespondWithCompletion($"  \n{Completion}\n ");

        TinyMceAiCompletionResult result = await CreateService().CompleteAsync(Prompt, CancellationToken.None);

        Assert.That(result.Succeeded, Is.True);
        Assert.That(result.Content, Is.EqualTo(Completion));
        AssertSingleSuccessLogEntry();
    }

    [Test]
    public async Task Success_WithoutContent_ReturnsEmptyString()
    {
        _stub.RespondWithCompletion(null);

        TinyMceAiCompletionResult result = await CreateService().CompleteAsync(Prompt, CancellationToken.None);

        Assert.That(result.Succeeded, Is.True);
        Assert.That(result.Content, Is.EqualTo(""));
        AssertSingleSuccessLogEntry();
    }

    // ---- Failure categories (data-model §3) ----

    /// <summary>Every row of the mapping table. Each provider error carries the key-echoing message.</summary>
    public static IEnumerable<TestCaseData> FailureCases()
    {
        static TestCaseData Case(string name, Action<StubOpenAiHandler> script, string category) =>
            new TestCaseData(script, category).SetName($"Failure_{name}_Is_{category}");

        yield return Case("401", s => s.RespondWithError(HttpStatusCode.Unauthorized, ProviderErrorMessage, "invalid_api_key"), Categories.Authentication);
        yield return Case("403", s => s.RespondWithError(HttpStatusCode.Forbidden, ProviderErrorMessage), Categories.Authentication);
        yield return Case("429Quota", s => s.RespondWithError(HttpStatusCode.TooManyRequests, ProviderErrorMessage, "insufficient_quota", "insufficient_quota"), Categories.QuotaExceeded);
        yield return Case("429Rate", s => s.RespondWithError(HttpStatusCode.TooManyRequests, ProviderErrorMessage, "rate_limit_exceeded"), Categories.RateLimited);
        yield return Case("429NoBody", s => s.RespondWith(HttpStatusCode.TooManyRequests, ""), Categories.RateLimited);
        yield return Case("400", s => s.RespondWithError(HttpStatusCode.BadRequest, ProviderErrorMessage), Categories.InvalidRequest);
        yield return Case("404", s => s.RespondWithError(HttpStatusCode.NotFound, ProviderErrorMessage, "model_not_found"), Categories.InvalidRequest);
        yield return Case("422", s => s.RespondWithError(HttpStatusCode.UnprocessableEntity, ProviderErrorMessage), Categories.InvalidRequest);
        yield return Case("500", s => s.RespondWithError(HttpStatusCode.InternalServerError, ProviderErrorMessage, type: "server_error"), Categories.Unavailable);
        yield return Case("503", s => s.RespondWithError(HttpStatusCode.ServiceUnavailable, ProviderErrorMessage, type: "server_error"), Categories.Unavailable);
        yield return Case("ConnectionFailure", s => s.FailWithConnectionError(), Categories.Unavailable);
        yield return Case("Timeout", s => s.FailWithTimeout(), Categories.Timeout);
        yield return Case("409", s => s.RespondWithError(HttpStatusCode.Conflict, ProviderErrorMessage), Categories.Unknown);
        yield return Case("200Unparseable", s => s.RespondWith(HttpStatusCode.OK, "not json " + ProviderErrorMessage), Categories.Unknown);
    }

    [TestCaseSource(nameof(FailureCases))]
    public async Task Failure_MapsToItsCategory_AndLogsOneSafeWarning(Action<StubOpenAiHandler> script, string category)
    {
        script(_stub);

        TinyMceAiCompletionResult result = await CreateService().CompleteAsync(Prompt, CancellationToken.None);

        Assert.That(result.Succeeded, Is.False);
        Assert.That(result.NotConfigured, Is.False);
        Assert.That(result.ErrorCategory, Is.EqualTo(category));
        Assert.That(result.Content, Is.Null);
        Assert.That(_stub.CallCount, Is.EqualTo(1));
        AssertSingleFailureLogEntry(category);
    }

    // ---- Caller cancellation ----

    [Test]
    public void CallerCancellation_Rethrows_AndCancelsTheUpstreamRequest()
    {
        var upstreamCancelled = new TaskCompletionSource();
        _stub.HangUntilCancelled(upstreamCancelled);
        using var cts = new CancellationTokenSource();

        Task<TinyMceAiCompletionResult> call = CreateService().CompleteAsync(Prompt, cts.Token);
        cts.CancelAfter(TimeSpan.FromMilliseconds(100));

        Assert.That(async () => await call, Throws.InstanceOf<OperationCanceledException>());
        Assert.That(upstreamCancelled.Task.IsCompleted, Is.True, "the upstream request was not cancelled");
    }

    // ---- Logging helpers (C-AI-7) ----

    private void AssertSingleSuccessLogEntry()
    {
        Assert.That(_logger.Entries, Has.Count.EqualTo(1), "exactly one log entry per call");
        CapturingLogger<OpenAiCompletionService>.Entry entry = _logger.Entries[0];
        Assert.That(entry.Level, Is.EqualTo(LogLevel.Information));
        Assert.That(entry.Template, Is.EqualTo(SuccessTemplate));
        Assert.That(entry.Properties["Outcome"], Is.EqualTo("Succeeded"));
        Assert.That(entry.Properties["UserKey"], Is.EqualTo(_userKey));
        Assert.That(entry.Properties.ContainsKey("DurationMs"), Is.True);
        Assert.That(entry.Properties.ContainsKey("ErrorCategory"), Is.False);
        AssertNoSecretsLogged();
    }

    private void AssertSingleFailureLogEntry(string category)
    {
        Assert.That(_logger.Entries, Has.Count.EqualTo(1), "exactly one log entry per call");
        CapturingLogger<OpenAiCompletionService>.Entry entry = _logger.Entries[0];
        Assert.That(entry.Level, Is.EqualTo(LogLevel.Warning));
        Assert.That(entry.Template, Is.EqualTo(FailureTemplate));
        Assert.That(entry.Properties["Outcome"], Is.EqualTo("Failed"));
        Assert.That(entry.Properties["UserKey"], Is.EqualTo(_userKey));
        Assert.That(entry.Properties.ContainsKey("DurationMs"), Is.True);
        Assert.That(entry.Properties["ErrorCategory"], Is.EqualTo(category));
        AssertNoSecretsLogged();
    }

    private void AssertNoSecretsLogged()
    {
        foreach (CapturingLogger<OpenAiCompletionService>.Entry entry in _logger.Entries)
        {
            Assert.That(entry.AllText, Does.Not.Contain(Prompt), "prompt logged");
            Assert.That(entry.AllText, Does.Not.Contain("PROMPT-TEXT-7c2e"), "prompt logged");
            Assert.That(entry.AllText, Does.Not.Contain("COMPLETION-TEXT-91ab"), "completion logged");
            Assert.That(entry.AllText, Does.Not.Contain(SentinelKey), "key logged");
            Assert.That(entry.AllText, Does.Not.Contain("4d1f"), "key fragment logged");
            Assert.That(entry.AllText, Does.Not.Contain("Incorrect API key"), "provider message logged");
        }
    }
}
