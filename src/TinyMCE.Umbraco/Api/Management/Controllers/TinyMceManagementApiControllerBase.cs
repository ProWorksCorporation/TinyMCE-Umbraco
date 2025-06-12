using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Common.Filters;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Web.Common.Authorization;
using UmbConstants = Umbraco.Cms.Core.Constants;

namespace TinyMCE.Umbraco.Api.Management;

[ApiExplorerSettings(GroupName = Constants.ProjectName)]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
[TinyMceVersionedApiBackOfficeRoute("/")]
[JsonOptionsName(UmbConstants.JsonOptionsNames.BackOffice)]
[MapToApi(Constants.ProjectAlias)]
public abstract class TinyMceManagementApiControllerBase : ManagementApiControllerBase { }
