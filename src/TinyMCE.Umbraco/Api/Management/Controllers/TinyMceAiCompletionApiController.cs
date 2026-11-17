using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TinyMCE.Umbraco.Services;

namespace TinyMCE.Umbraco.Api.Management;

/// <summary>
///     Relays the TinyMCE AI assistant's requests to the AI provider from the server, so the provider key stays on the
///     server (CL-001). Backoffice users only, through <see cref="TinyMceManagementApiControllerBase"/>; no usage limit
///     is applied (FR-019a). Contract: specs/004-upgrade-umbraco-17-8/contracts/ai-completion.md.
/// </summary>
[ApiExplorerSettings(GroupName = Constants.ProjectName)]
[ApiVersion("1.0")]
[TinyMceVersionedApiBackOfficeRoute("/")]
public sealed class TinyMceAiCompletionApiController : TinyMceManagementApiControllerBase
{
    private readonly ITinyMceAiCompletionService _aiCompletionService;

    /// <summary>Initializes a new instance of the <see cref="TinyMceAiCompletionApiController"/> class.</summary>
    public TinyMceAiCompletionApiController(ITinyMceAiCompletionService aiCompletionService)
        => _aiCompletionService = aiCompletionService;

    /// <summary>Completes a prompt with the configured AI provider.</summary>
    /// <param name="model">The prompt.</param>
    /// <param name="cancellationToken">Aborted when the editor aborts the request; cancels the provider call.</param>
    [HttpPost("ai/completion", Name = "PostAiCompletion")]
    [MapToApiVersion("1.0")]
    [ProducesResponseType(typeof(TinyMceAiCompletionResponseModel), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> PostAiCompletion(
        [FromBody] TinyMceAiCompletionRequestModel model,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(model?.Prompt))
        {
            return AiProblem(StatusCodes.Status400BadRequest, TinyMceAiConstants.ProblemTypeInvalidRequest, "A prompt is required.");
        }

        TinyMceAiCompletionResult result = await _aiCompletionService.CompleteAsync(model.Prompt, cancellationToken);

        if (result.Succeeded)
        {
            return Ok(new TinyMceAiCompletionResponseModel { Content = result.Content ?? "" });
        }

        if (result.NotConfigured)
        {
            return AiProblem(
                StatusCodes.Status503ServiceUnavailable,
                TinyMceAiConstants.ProblemTypeNotConfigured,
                "The AI assistant is not configured on the server.");
        }

        // Only the category goes back to the browser, never provider text: OpenAI's error messages can echo a masked
        // fragment of the key (research R9).
        return AiProblem(
            StatusCodes.Status502BadGateway,
            TinyMceAiConstants.ProblemTypeProviderError,
            "The AI provider could not complete the request.",
            result.ErrorCategory ?? TinyMceAiConstants.ErrorCategories.Unknown);
    }

    /// <summary>A ProblemDetails response built only from fixed strings.</summary>
    private static ObjectResult AiProblem(int status, string type, string title, string? category = null)
    {
        var problem = new ProblemDetails { Status = status, Type = type, Title = title };
        if (category is not null)
        {
            problem.Extensions["category"] = category;
        }

        return new ObjectResult(problem) { StatusCode = status };
    }
}
