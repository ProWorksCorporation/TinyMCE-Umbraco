using Asp.Versioning;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Common.OpenApi;

namespace TinyMCE.Umbraco.Api.Management;

internal sealed class TinyMceOperationIdHandler : OperationIdHandler
{
    public TinyMceOperationIdHandler(IOptions<ApiVersioningOptions> apiVersioningOptions)
        : base(apiVersioningOptions)
    { }

    protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
        => controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith(Constants.ProjectNamespace) == true;
}
