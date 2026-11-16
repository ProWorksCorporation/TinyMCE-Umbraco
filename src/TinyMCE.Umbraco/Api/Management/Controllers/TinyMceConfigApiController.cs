using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace TinyMCE.Umbraco.Api.Management;

[ApiExplorerSettings(GroupName = Constants.ProjectName)]
[ApiVersion("1.0")]
[TinyMceVersionedApiBackOfficeRoute("/")]
public sealed class TinyMceConfigApiController : TinyMceManagementApiControllerBase
{
    private readonly RichTextEditorSettings _richTextEditorSettings;
    private readonly TinyMceConfig _tinyMceConfig;

    public TinyMceConfigApiController(
        IOptions<RichTextEditorSettings> richTextEditorSettings,
        IOptions<TinyMceConfig> tinyMceConfig)
    {
        _richTextEditorSettings = richTextEditorSettings.Value;
        _tinyMceConfig = tinyMceConfig.Value;

        // Ensure dictionaries are at least empty maps to prevent null refs
        _richTextEditorSettings.CustomConfig ??= new Dictionary<string, object>();
        _tinyMceConfig.customConfig ??= new Dictionary<string, object>();
    }

    /// <summary>
    ///     Returns the editor configuration as an allow-list projection of both configuration sections (constitution
    ///     1.2.0). The AI provider key is never included; see <see cref="TinyMceClientConfigModel"/>.
    /// </summary>
    [HttpGet("config", Name = "GetConfig")]
    [MapToApiVersion("1.0")]
    [ProducesResponseType(typeof(TinyMceConfigResponseModel), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetConfig()
    {
        // true and false boolean
        RichTextEditorSettings.NormalizeBooleanCustomConfig(_richTextEditorSettings.CustomConfig);
        RichTextEditorSettings.NormalizeBooleanCustomConfig(_tinyMceConfig.customConfig);

        // An allow-list projection (constitution 1.2.0): only fields the editor needs and that are safe in a browser
        // are copied, so the AI provider key, and any setting added later, stays on the server unless it is added to
        // the projection models on purpose.
        var result = new TinyMceConfigResponseModel
        {
            RichTextEditor = TinyMceRichTextEditorClientModel.From(_richTextEditorSettings),
            Config = TinyMceClientConfigModel.From(_tinyMceConfig),
        };

        return Ok(result);
    }
}
