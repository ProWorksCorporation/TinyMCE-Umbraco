namespace TinyMCE.Umbraco.Api.Management;

/// <summary>The body of <c>POST /umbraco/management/api/v1/tiny-mce/ai/completion</c>.</summary>
public sealed class TinyMceAiCompletionRequestModel
{
    /// <summary>The prompt TinyMCE's AI plugin built. Required; an empty or whitespace-only prompt gives a <c>400</c>.</summary>
    public required string Prompt { get; init; }
}
