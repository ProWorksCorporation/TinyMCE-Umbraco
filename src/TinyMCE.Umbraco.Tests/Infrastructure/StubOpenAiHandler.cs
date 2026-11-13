using System.Collections.Concurrent;
using System.Net;
using System.Text;

namespace TinyMCE.Umbraco.Tests.Infrastructure;

/// <summary>
///     Stands in for OpenAI. Each call takes the next scripted step: a response, a connection failure or a timeout.
///     Every request is recorded, so tests can assert what was sent upstream, and whether anything was.
/// </summary>
public sealed class StubOpenAiHandler : HttpMessageHandler
{
    private readonly ConcurrentQueue<Func<CancellationToken, Task<HttpResponseMessage>>> _steps = new();
    private readonly ConcurrentQueue<RecordedRequest> _requests = new();

    /// <summary>One request as the handler received it.</summary>
    public sealed record RecordedRequest(
        HttpMethod Method,
        Uri? Uri,
        IReadOnlyDictionary<string, string> Headers,
        string Body);

    /// <summary>How many requests reached the stub.</summary>
    public int CallCount => _requests.Count;

    /// <summary>The requests that reached the stub, in order.</summary>
    public IReadOnlyList<RecordedRequest> Requests => _requests.ToArray();

    /// <summary>Queues a response with a JSON body.</summary>
    public StubOpenAiHandler RespondWith(HttpStatusCode status, string jsonBody)
    {
        _steps.Enqueue(_ => Task.FromResult(new HttpResponseMessage(status)
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, "application/json"),
        }));
        return this;
    }

    /// <summary>Queues a successful Chat Completions response whose first choice is <paramref name="content"/>.</summary>
    public StubOpenAiHandler RespondWithCompletion(string? content)
    {
        string choice = content is null
            ? """{ "index": 0, "message": { "role": "assistant" } }"""
            : $$"""{ "index": 0, "message": { "role": "assistant", "content": {{System.Text.Json.JsonSerializer.Serialize(content)}} } }""";
        return RespondWith(HttpStatusCode.OK, $$"""{ "id": "chatcmpl-test", "object": "chat.completion", "choices": [ {{choice}} ] }""");
    }

    /// <summary>Queues an OpenAI-style error response.</summary>
    public StubOpenAiHandler RespondWithError(HttpStatusCode status, string message, string? code = null, string type = "invalid_request_error")
    {
        string codeJson = code is null ? "null" : $"\"{code}\"";
        return RespondWith(
            status,
            $$"""{ "error": { "message": {{System.Text.Json.JsonSerializer.Serialize(message)}}, "type": "{{type}}", "param": null, "code": {{codeJson}} } }""");
    }

    /// <summary>Queues a connection failure.</summary>
    public StubOpenAiHandler FailWithConnectionError()
    {
        _steps.Enqueue(_ => throw new HttpRequestException("Connection refused (stub)"));
        return this;
    }

    /// <summary>
    ///     Queues what <see cref="HttpClient"/> throws when its own timeout elapses: a <see cref="TaskCanceledException"/>
    ///     whose inner exception is a <see cref="TimeoutException"/>, while the caller's token is not cancelled.
    /// </summary>
    public StubOpenAiHandler FailWithTimeout()
    {
        _steps.Enqueue(_ => throw new TaskCanceledException(
            "The request was canceled due to the configured HttpClient.Timeout (stub).",
            new TimeoutException("stub timeout")));
        return this;
    }

    /// <summary>
    ///     Queues a response that never arrives until the request is cancelled, so a test can observe that cancelling
    ///     the caller cancels the upstream request.
    /// </summary>
    public StubOpenAiHandler HangUntilCancelled(TaskCompletionSource cancelled)
    {
        _steps.Enqueue(async token =>
        {
            try
            {
                await Task.Delay(Timeout.InfiniteTimeSpan, token);
            }
            catch (OperationCanceledException)
            {
                cancelled.TrySetResult();
                throw;
            }

            throw new InvalidOperationException("unreachable");
        });
        return this;
    }

    /// <summary>Removes queued steps and recorded requests.</summary>
    public void Reset()
    {
        _steps.Clear();
        _requests.Clear();
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var headers = request.Headers
            .Concat(request.Content?.Headers ?? Enumerable.Empty<KeyValuePair<string, IEnumerable<string>>>())
            .ToDictionary(h => h.Key, h => string.Join(",", h.Value), StringComparer.OrdinalIgnoreCase);
        string body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
        _requests.Enqueue(new RecordedRequest(request.Method, request.RequestUri, headers, body));

        cancellationToken.ThrowIfCancellationRequested();

        if (!_steps.TryDequeue(out Func<CancellationToken, Task<HttpResponseMessage>>? step))
        {
            throw new InvalidOperationException("StubOpenAiHandler: no scripted response for this request.");
        }

        return await step(cancellationToken);
    }
}
