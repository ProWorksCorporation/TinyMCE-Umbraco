namespace TinyMCE.Umbraco.Services;

/// <summary>
///     Completes an editor's AI assistant prompt on the server, so the AI provider key never reaches a browser
///     (CL-001). The contract is provider-neutral: a prompt in, text out. A later implementation backed by Umbraco.AI
///     can replace <see cref="OpenAiCompletionService"/> without changing the endpoint or the editor.
/// </summary>
public interface ITinyMceAiCompletionService
{
    /// <summary>Sends <paramref name="prompt"/> to the configured AI provider and returns its completion.</summary>
    /// <param name="prompt">The prompt TinyMCE's AI plugin built; never logged.</param>
    /// <param name="cancellationToken">Cancels the provider call, for example when the editor aborts the request.</param>
    /// <returns>The completion, or why there is none. Provider failures are returned, not thrown.</returns>
    /// <exception cref="OperationCanceledException"><paramref name="cancellationToken"/> was cancelled.</exception>
    Task<TinyMceAiCompletionResult> CompleteAsync(string prompt, CancellationToken cancellationToken);
}
