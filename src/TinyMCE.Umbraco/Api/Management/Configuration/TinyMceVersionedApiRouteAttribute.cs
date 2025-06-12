using Umbraco.Cms.Api.Management.Routing;

namespace TinyMCE.Umbraco.Api.Management;

internal sealed class TinyMceVersionedApiBackOfficeRouteAttribute : VersionedApiBackOfficeRouteAttribute
{
    public TinyMceVersionedApiBackOfficeRouteAttribute(string template)
        : base($"{Constants.ProjectAlias}/{template.TrimStart('/')}")
    { }
}
