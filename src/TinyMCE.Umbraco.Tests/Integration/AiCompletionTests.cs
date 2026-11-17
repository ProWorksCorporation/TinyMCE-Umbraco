using System.Linq.Expressions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NUnit.Framework;
using TinyMCE.Umbraco.Api.Management;
using TinyMCE.Umbraco.Services;
using TinyMCE.Umbraco.Tests.Infrastructure;
using TinyMCE.Umbraco.Tests.Unit;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Tests.Integration.ManagementApi;
using Categories = TinyMCE.Umbraco.Services.TinyMceAiConstants.ErrorCategories;

namespace TinyMCE.Umbraco.Tests.Integration;

/// <summary>
///     Shared host setup for the AI relay's contract tests
///     (specs/004-upgrade-umbraco-17-8/contracts/ai-completion.md): OpenAI is replaced by
///     <see cref="StubOpenAiHandler"/>, and the service's log entries are captured.
/// </summary>
public abstract class AiCompletionTestBase : ManagementApiTest<TinyMceAiCompletionApiController>
{
    /// <summary>The route the editor calls, pinned literally so a route change fails here.</summary>
    protected const string CompletionUrl = "/umbraco/management/api/v1/tiny-mce/ai/completion";

    protected StubOpenAiHandler Stub { get; } = new();

    protected CapturingLogger<OpenAiCompletionService> Logger { get; } = new();

    protected override Expression<Func<TinyMceAiCompletionApiController, object>> MethodSelector { get; set; } =
        x => x.PostAiCompletion(default!, default);

    /// <summary>The OpenAI key this fixture's host is configured with; empty for "not configured".</summary>
    protected abstract string ConfiguredKey { get; }

    [SetUp]
    public override void Setup()
    {
        InMemoryConfiguration["TinyMceConfig:openAiApikey"] = ConfiguredKey;
        InMemoryConfiguration["TinyMceConfig:OpenAiApiConfig:model"] = "gpt-test-model";
        InMemoryConfiguration["TinyMceConfig:OpenAiApiConfig:temperature"] = "0.25";
        InMemoryConfiguration["TinyMceConfig:OpenAiApiConfig:maxCompletionTokens"] = "321";
        InMemoryConfiguration["TinyMceConfig:OpenAiApiConfig:developerMessage"] = "Answer in British English.";

        base.Setup();

        Stub.Reset();
        Logger.Clear();
    }

    [OneTimeTearDown]
    public void DisposeStub() => Stub.Dispose();

    protected override void CustomMvcSetup(IMvcBuilder mvcBuilder) =>
        mvcBuilder.AddApplicationPart(typeof(TinyMceAiCompletionApiController).Assembly);

    protected override void CustomTestSetup(IUmbracoBuilder builder)
    {
        base.CustomTestSetup(builder);

        // The stub is the named client's innermost handler, so everything above it (including the client's
        // timeout) is the real pipeline. An infinite lifetime stops the factory disposing the shared stub.
        builder.Services
            .AddHttpClient(TinyMceAiConstants.HttpClientName)
            .ConfigurePrimaryHttpMessageHandler(() => Stub)
            .SetHandlerLifetime(Timeout.InfiniteTimeSpan);

        // Closed-generic, not a logger provider: the test server replaces ILoggerFactory afterwards (research R6).
        builder.Services.AddSingleton<ILogger<OpenAiCompletionService>>(Logger);
    }

    protected async Task AuthenticateAsAdminAsync() =>
        await AuthenticateClientAsync(Client, "admin@example.com", UserPassword, isAdmin: true);

    protected Task<HttpResponseMessage> PostPromptAsync(string prompt, CancellationToken cancellationToken = default) =>
        Client.PostAsJsonAsync(CompletionUrl, new { prompt }, cancellationToken);

    /// <summary>C-AI-5: nothing secret, and nothing the provider said, ever reaches the browser.</summary>
    protected static void AssertBodyLeaksNothing(string body)
    {
        Assert.That(body, Does.Not.Contain(OpenAiCompletionServiceTests.SentinelKey), "key in response");
        Assert.That(body, Does.Not.Contain("4d1f"), "key fragment in response");
        Assert.That(body, Does.Not.Contain("Incorrect API key"), "provider message in response");
        Assert.That(body, Does.Not.Contain("Bearer"), "Authorization header in response");
    }

    /// <summary>C-AI-7: the captured log entries carry neither the prompt, the completion nor the key.</summary>
    protected void AssertLogsLeakNothing()
    {
        foreach (CapturingLogger<OpenAiCompletionService>.Entry entry in Logger.Entries)
        {
            Assert.That(entry.AllText, Does.Not.Contain("PROMPT-TEXT-7c2e"), "prompt logged");
            Assert.That(entry.AllText, Does.Not.Contain("COMPLETION-TEXT-91ab"), "completion logged");
            Assert.That(entry.AllText, Does.Not.Contain(OpenAiCompletionServiceTests.SentinelKey), "key logged");
            Assert.That(entry.AllText, Does.Not.Contain("Incorrect API key"), "provider message logged");
        }
    }

    protected static async Task<(HttpStatusCode Status, string Body, JsonElement Json)> ReadAsync(HttpResponseMessage response)
    {
        string body = await response.Content.ReadAsStringAsync();
        JsonElement json = string.IsNullOrWhiteSpace(body) ? default : JsonDocument.Parse(body).RootElement;
        return (response.StatusCode, body, json);
    }
}

/// <summary>C-AI-1 and C-AI-3…8, with an OpenAI key configured.</summary>
[TestFixture]
public class AiCompletionTests : AiCompletionTestBase
{
    protected override string ConfiguredKey => OpenAiCompletionServiceTests.SentinelKey;

    /// <summary>C-AI-1: the provider's first choice comes back, trimmed.</summary>
    [Test]
    public async Task Completion_Returns200WithTheTrimmedContent()
    {
        Stub.RespondWithCompletion($"  {OpenAiCompletionServiceTests.Completion}\n");
        await AuthenticateAsAdminAsync();

        var (status, body, json) = await ReadAsync(await PostPromptAsync(OpenAiCompletionServiceTests.Prompt));

        Assert.That(status, Is.EqualTo(HttpStatusCode.OK), body);
        Assert.That(json.GetProperty("content").GetString(), Is.EqualTo(OpenAiCompletionServiceTests.Completion));
        AssertBodyLeaksNothing(body);
    }

    /// <summary>C-AI-3 and C-AI-5: each provider failure becomes a 502 with only its category.</summary>
    public static IEnumerable<TestCaseData> ProviderFailures()
    {
        static TestCaseData Case(string name, Action<StubOpenAiHandler> script, string category) =>
            new TestCaseData(script, category).SetName($"ProviderFailure_{name}_Returns502_{category}");

        const string message = OpenAiCompletionServiceTests.ProviderErrorMessage;
        yield return Case("401", s => s.RespondWithError(HttpStatusCode.Unauthorized, message, "invalid_api_key"), Categories.Authentication);
        yield return Case("429Quota", s => s.RespondWithError(HttpStatusCode.TooManyRequests, message, "insufficient_quota", "insufficient_quota"), Categories.QuotaExceeded);
        yield return Case("429Rate", s => s.RespondWithError(HttpStatusCode.TooManyRequests, message, "rate_limit_exceeded"), Categories.RateLimited);
        yield return Case("400", s => s.RespondWithError(HttpStatusCode.BadRequest, message), Categories.InvalidRequest);
        yield return Case("500", s => s.RespondWithError(HttpStatusCode.InternalServerError, message, type: "server_error"), Categories.Unavailable);
        yield return Case("Timeout", s => s.FailWithTimeout(), Categories.Timeout);
    }

    [TestCaseSource(nameof(ProviderFailures))]
    public async Task ProviderFailure_Returns502WithCategory(Action<StubOpenAiHandler> script, string category)
    {
        script(Stub);
        await AuthenticateAsAdminAsync();

        var (status, body, json) = await ReadAsync(await PostPromptAsync(OpenAiCompletionServiceTests.Prompt));

        Assert.That(status, Is.EqualTo(HttpStatusCode.BadGateway), body);
        Assert.That(json.GetProperty("type").GetString(), Is.EqualTo(TinyMceAiConstants.ProblemTypeProviderError));
        Assert.That(json.GetProperty("title").GetString(), Is.EqualTo("The AI provider could not complete the request."));
        Assert.That(json.GetProperty("category").GetString(), Is.EqualTo(category));
        Assert.That(Stub.CallCount, Is.EqualTo(1));
        AssertBodyLeaksNothing(body);
        AssertLogsLeakNothing();
    }

    /// <summary>An empty prompt is refused before any provider call.</summary>
    [TestCase("")]
    [TestCase("   ")]
    public async Task EmptyPrompt_Returns400InvalidRequest(string prompt)
    {
        await AuthenticateAsAdminAsync();

        var (status, body, json) = await ReadAsync(await PostPromptAsync(prompt));

        Assert.That(status, Is.EqualTo(HttpStatusCode.BadRequest), body);
        Assert.That(json.GetProperty("type").GetString(), Is.EqualTo(TinyMceAiConstants.ProblemTypeInvalidRequest));
        Assert.That(json.GetProperty("title").GetString(), Is.EqualTo("A prompt is required."));
        Assert.That(Stub.CallCount, Is.EqualTo(0));
        AssertBodyLeaksNothing(body);
    }

    /// <summary>C-AI-4: an unauthenticated request is refused, and the provider is never called.</summary>
    [Test]
    public async Task Unauthenticated_Returns401_WithoutCallingTheProvider()
    {
        Stub.RespondWithCompletion(OpenAiCompletionServiceTests.Completion);

        var (status, body, _) = await ReadAsync(await PostPromptAsync(OpenAiCompletionServiceTests.Prompt));

        Assert.That(status, Is.EqualTo(HttpStatusCode.Unauthorized), body);
        Assert.That(Stub.CallCount, Is.EqualTo(0));
        AssertBodyLeaksNothing(body);
    }

    /// <summary>C-AI-6: the upstream request carries the key and today's request shape.</summary>
    [Test]
    public async Task UpstreamRequest_HasBearerKey_AndTheConfiguredBody()
    {
        Stub.RespondWithCompletion(OpenAiCompletionServiceTests.Completion);
        await AuthenticateAsAdminAsync();

        HttpResponseMessage response = await PostPromptAsync(OpenAiCompletionServiceTests.Prompt);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), await response.Content.ReadAsStringAsync());
        Assert.That(Stub.CallCount, Is.EqualTo(1));
        StubOpenAiHandler.RecordedRequest request = Stub.Requests[0];
        Assert.That(request.Method, Is.EqualTo(HttpMethod.Post));
        Assert.That(request.Uri, Is.EqualTo(new Uri(TinyMceAiConstants.OpenAiChatCompletionsUrl)));
        Assert.That(request.Headers["Authorization"], Is.EqualTo($"Bearer {OpenAiCompletionServiceTests.SentinelKey}"));

        JsonElement upstream = JsonDocument.Parse(request.Body).RootElement;
        Assert.That(upstream.GetProperty("model").GetString(), Is.EqualTo("gpt-test-model"));
        Assert.That(upstream.GetProperty("temperature").GetDouble(), Is.EqualTo(0.25));
        Assert.That(upstream.GetProperty("max_completion_tokens").GetInt32(), Is.EqualTo(321));
        JsonElement[] messages = upstream.GetProperty("messages").EnumerateArray().ToArray();
        Assert.That(messages.Select(m => m.GetProperty("role").GetString()), Is.EqualTo(new[] { "user", "developer" }));
        Assert.That(messages[0].GetProperty("content").GetString(), Is.EqualTo(OpenAiCompletionServiceTests.Prompt));
        Assert.That(messages[1].GetProperty("content").GetString(), Is.EqualTo("Answer in British English."));
    }

    /// <summary>C-AI-7: one attribution entry per request, and nothing else from the relay.</summary>
    [Test]
    public async Task EachRequest_LogsOneAttributionEntry_WithoutContent()
    {
        Stub.RespondWithCompletion(OpenAiCompletionServiceTests.Completion)
            .RespondWithError(HttpStatusCode.TooManyRequests, OpenAiCompletionServiceTests.ProviderErrorMessage, "rate_limit_exceeded");
        await AuthenticateAsAdminAsync();

        await PostPromptAsync(OpenAiCompletionServiceTests.Prompt);
        await PostPromptAsync(OpenAiCompletionServiceTests.Prompt);

        Assert.That(Logger.Entries, Has.Count.EqualTo(2));
        CapturingLogger<OpenAiCompletionService>.Entry success = Logger.Entries[0];
        CapturingLogger<OpenAiCompletionService>.Entry failure = Logger.Entries[1];

        Assert.That(success.Level, Is.EqualTo(LogLevel.Information));
        Assert.That(success.Properties["Outcome"], Is.EqualTo("Succeeded"));
        Assert.That(success.Properties["UserKey"], Is.InstanceOf<Guid>().And.Not.EqualTo(Guid.Empty));

        Assert.That(failure.Level, Is.EqualTo(LogLevel.Warning));
        Assert.That(failure.Properties["Outcome"], Is.EqualTo("Failed"));
        Assert.That(failure.Properties["ErrorCategory"], Is.EqualTo(Categories.RateLimited));
        Assert.That(failure.Properties["UserKey"], Is.EqualTo(success.Properties["UserKey"]));

        AssertLogsLeakNothing();
    }

    /// <summary>C-AI-8: when the editor aborts, the request to the provider is cancelled too.</summary>
    [Test]
    public async Task ClientAbort_CancelsTheUpstreamRequest()
    {
        var upstreamCancelled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        Stub.HangUntilCancelled(upstreamCancelled);
        await AuthenticateAsAdminAsync();
        using var cts = new CancellationTokenSource();

        Task<HttpResponseMessage> call = PostPromptAsync(OpenAiCompletionServiceTests.Prompt, cts.Token);
        await WaitUntilAsync(() => Stub.CallCount == 1, TimeSpan.FromSeconds(10));
        cts.Cancel();

        Assert.That(async () => await call, Throws.InstanceOf<OperationCanceledException>());
        Task finished = await Task.WhenAny(upstreamCancelled.Task, Task.Delay(TimeSpan.FromSeconds(10)));
        Assert.That(finished, Is.SameAs(upstreamCancelled.Task), "the upstream request was not cancelled");
    }

    private static async Task WaitUntilAsync(Func<bool> condition, TimeSpan timeout)
    {
        DateTime deadline = DateTime.UtcNow + timeout;
        while (!condition())
        {
            if (DateTime.UtcNow > deadline)
            {
                Assert.Fail("timed out waiting for the upstream request");
            }

            await Task.Delay(20);
        }
    }
}

/// <summary>C-AI-2, on a host with no OpenAI key configured.</summary>
[TestFixture]
public class AiCompletionNotConfiguredTests : AiCompletionTestBase
{
    protected override string ConfiguredKey => "";

    /// <summary>C-AI-2: 503, and no provider call at all.</summary>
    [Test]
    public async Task NoKey_Returns503NotConfigured_WithoutCallingTheProvider()
    {
        await AuthenticateAsAdminAsync();

        var (status, body, json) = await ReadAsync(await PostPromptAsync(OpenAiCompletionServiceTests.Prompt));

        Assert.That(status, Is.EqualTo(HttpStatusCode.ServiceUnavailable), body);
        Assert.That(json.GetProperty("type").GetString(), Is.EqualTo(TinyMceAiConstants.ProblemTypeNotConfigured));
        Assert.That(json.GetProperty("title").GetString(), Is.EqualTo("The AI assistant is not configured on the server."));
        Assert.That(Stub.CallCount, Is.EqualTo(0));
        AssertBodyLeaksNothing(body);

        Assert.That(Logger.Entries, Has.Count.EqualTo(1));
        Assert.That(Logger.Entries[0].Level, Is.EqualTo(LogLevel.Warning));
        Assert.That(Logger.Entries[0].Properties["ErrorCategory"], Is.EqualTo(Categories.NotConfigured));
        AssertLogsLeakNothing();
    }
}
