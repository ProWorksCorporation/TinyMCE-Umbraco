namespace TinyMCE.Umbraco.Api.Management;

/// <summary>
///     The response of <c>GET /umbraco/management/api/v1/tiny-mce/config</c>: allow-list projections of both
///     configuration sections, never the options objects themselves (constitution 1.2.0).
/// </summary>
public sealed class TinyMceConfigResponseModel
{
    /// <summary>Browser-safe settings from <c>Umbraco:CMS:RichTextEditor</c>.</summary>
    public TinyMceRichTextEditorClientModel? RichTextEditor { get; set; }

    /// <summary>Browser-safe settings from <c>TinyMceConfig</c>; never the AI provider key.</summary>
    public TinyMceClientConfigModel? Config { get; set; }
}
