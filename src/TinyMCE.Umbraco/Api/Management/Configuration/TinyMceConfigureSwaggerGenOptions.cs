using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Management.OpenApi;

namespace TinyMCE.Umbraco.Api.Management;

internal sealed class TinyMceConfigureSwaggerGenOptions : IConfigureOptions<SwaggerGenOptions>
{
    public void Configure(SwaggerGenOptions options)
    {
        options.SwaggerDoc(
            Constants.ProjectAlias,
            new OpenApiInfo
            {
                Title = $"{Constants.ProjectName} Management API",
                Version = "Latest",
            }
        );

        options.OperationFilter<TinyMceApiOperationSecurityFilter>();
    }
}

internal sealed class TinyMceApiOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
{
    protected override string ApiName => Constants.ProjectAlias;
}
