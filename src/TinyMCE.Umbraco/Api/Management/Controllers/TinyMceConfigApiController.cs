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

    [HttpGet("config", Name = "GetConfig")]
    [MapToApiVersion("1.0")]
    [ProducesResponseType(typeof(TinyMceConfigResponseModel), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetConfig()
    {
        // true and false boolean
        RichTextEditorSettings.NormalizeBooleanCustomConfig(_richTextEditorSettings.CustomConfig);
        RichTextEditorSettings.NormalizeBooleanCustomConfig(_tinyMceConfig.customConfig);

        var result = new TinyMceConfigResponseModel
        {
            RichTextEditor = this._richTextEditorSettings,
            Config = this._tinyMceConfig,
        };

        return Ok(result);
    }
}
