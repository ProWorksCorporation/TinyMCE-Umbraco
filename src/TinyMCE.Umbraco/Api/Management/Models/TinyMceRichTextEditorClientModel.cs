namespace TinyMCE.Umbraco.Api.Management;

/// <summary>
///     The part of <see cref="RichTextEditorSettings"/> (<c>Umbraco:CMS:RichTextEditor</c>) that the editor in the
///     browser needs: an allow-list projection (constitution 1.2.0). Property names and types match
///     <see cref="RichTextEditorSettings"/>, so the JSON the editor reads is unchanged. A new settings property stays
///     invisible to the browser until it is added here on purpose.
/// </summary>
public sealed class TinyMceRichTextEditorClientModel
{
    /// <summary>The TinyMCE commands offered in the toolbar configuration.</summary>
    public RichTextEditorSettings.RichTextEditorCommand[] Commands { get; set; } = [];

    /// <summary>The TinyMCE plugins loaded by every editor.</summary>
    public string[] Plugins { get; set; } = [];

    /// <summary>TinyMCE options merged into every editor's configuration.</summary>
    public IDictionary<string, object> CustomConfig { get; set; } = new Dictionary<string, object>();

    /// <summary>TinyMCE's <c>valid_elements</c>.</summary>
    public string ValidElements { get; set; } = RichTextEditorSettings.StaticValidElements;

    /// <summary>TinyMCE's <c>invalid_elements</c>.</summary>
    public string InvalidElements { get; set; } = RichTextEditorSettings.StaticInvalidElements;

    /// <summary>The TinyMCE Cloud key (public client identifier), set through Umbraco's legacy section.</summary>
    public string? CloudApiKey { get; set; }

    /// <summary>Copies the browser-safe settings from <paramref name="source"/>, field by field.</summary>
    public static TinyMceRichTextEditorClientModel From(RichTextEditorSettings source) => new()
    {
        Commands = source.Commands,
        Plugins = source.Plugins,
        CustomConfig = source.CustomConfig,
        ValidElements = source.ValidElements,
        InvalidElements = source.InvalidElements,
        CloudApiKey = source.CloudApiKey,
    };
}
