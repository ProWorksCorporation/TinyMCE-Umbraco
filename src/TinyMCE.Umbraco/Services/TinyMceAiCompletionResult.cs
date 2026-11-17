namespace TinyMCE.Umbraco.Services;

/// <summary>
///     The outcome of one AI completion request. Exactly one of three shapes: succeeded with <see cref="Content"/>, not
///     configured, or failed with an <see cref="ErrorCategory"/>. It never carries provider response text.
/// </summary>
public sealed record TinyMceAiCompletionResult
{
    private TinyMceAiCompletionResult() { }

    /// <summary>Whether the provider returned a completion.</summary>
    public bool Succeeded { get; private init; }

    /// <summary>The generated text, trimmed; may be empty. <c>null</c> unless <see cref="Succeeded"/>.</summary>
    public string? Content { get; private init; }

    /// <summary>Whether the request was refused because no AI provider key is configured. No provider call was made.</summary>
    public bool NotConfigured { get; private init; }

    /// <summary>
    ///     One of <see cref="TinyMceAiConstants.ErrorCategories"/> when the provider call failed; otherwise <c>null</c>.
    /// </summary>
    public string? ErrorCategory { get; private init; }

    /// <summary>A completion was returned.</summary>
    /// <param name="content">The generated text.</param>
    public static TinyMceAiCompletionResult Success(string content) => new() { Succeeded = true, Content = content };

    /// <summary>No AI provider key is configured, so no provider call was made.</summary>
    public static TinyMceAiCompletionResult NotConfiguredResult() => new() { NotConfigured = true };

    /// <summary>The provider call failed.</summary>
    /// <param name="errorCategory">One of <see cref="TinyMceAiConstants.ErrorCategories"/>.</param>
    public static TinyMceAiCompletionResult Failure(string errorCategory) => new() { ErrorCategory = errorCategory };
}
