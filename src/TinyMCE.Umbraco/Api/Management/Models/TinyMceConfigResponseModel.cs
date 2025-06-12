namespace TinyMCE.Umbraco.Api.Management;

public sealed class TinyMceConfigResponseModel
{
    public RichTextEditorSettings? RichTextEditor { get; set; }

    public TinyMceConfig? Config { get; set; }
}
