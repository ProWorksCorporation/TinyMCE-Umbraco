namespace TinyMCE.Umbraco.Api.Management;

/// <summary>A successful response from <c>POST /umbraco/management/api/v1/tiny-mce/ai/completion</c>.</summary>
public sealed class TinyMceAiCompletionResponseModel
{
    /// <summary>The generated text, trimmed. May be empty.</summary>
    public required string Content { get; init; }
}
