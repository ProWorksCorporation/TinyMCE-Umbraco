using System.Linq.Expressions;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using TinyMCE.Umbraco.Api.Management;
using Umbraco.Cms.Tests.Integration.ManagementApi;

namespace TinyMCE.Umbraco.Tests.Integration;

/// <summary>
///     Contract tests for the package's OpenAPI document, <c>/umbraco/openapi/tiny-mce.json</c>
///     (specs/005-upgrade-umbraco-18-3/contracts/openapi-description.md, C-OAS-2 and C-OAS-3).
/// </summary>
/// <remarks>
///     The document is fetched through the test server, the same way Umbraco's own
///     <c>BackOfficeOpenApiDocumentWithJsonOptionsTests</c> does. The schema must describe what the controllers actually
///     send: they serialise with Umbraco's backoffice JSON options, which write enums as strings.
/// </remarks>
[TestFixture]
public class OpenApiDocumentTests : ManagementApiTest<TinyMceConfigApiController>
{
    private const string DocumentUrl = "/umbraco/openapi/tiny-mce.json";

    protected override Expression<Func<TinyMceConfigApiController, object>> MethodSelector { get; set; } =
        x => x.GetConfig();

    // As in ConfigResponseTests: Umbraco's harness only adds its own assemblies as MVC application parts.
    protected override void CustomMvcSetup(IMvcBuilder mvcBuilder) =>
        mvcBuilder.AddApplicationPart(typeof(TinyMceConfigApiController).Assembly);

    private async Task<JsonObject> GetDocumentAsync()
    {
        string json = await Client.GetStringAsync(DocumentUrl);
        JsonObject? document = JsonNode.Parse(json)?.AsObject();
        Assert.That(document, Is.Not.Null, "The OpenAPI document isn't a JSON object.");
        return document!;
    }

    /// <summary>C-OAS-3: the command mode is described as the text values the server sends, not as a number.</summary>
    [Test]
    public async Task Document_DescribesCommandModeAsStringEnum()
    {
        JsonObject document = await GetDocumentAsync();
        JsonObject schemas = document["components"]!["schemas"]!.AsObject();

        JsonObject? command = schemas["RichTextEditorCommand"]?.AsObject();
        Assert.That(command, Is.Not.Null, "No RichTextEditorCommand schema in the document.");

        JsonObject mode = command!["properties"]!["mode"]!.AsObject();
        if (mode["$ref"] is JsonValue reference)
        {
            string name = reference.GetValue<string>().Split('/').Last();
            mode = schemas[name]!.AsObject();
        }

        // OpenAPI 3.1 allows an enum of strings without "type"; Umbraco's own Management API document emits its string
        // enums that way (for example RuntimeLevelModel). What matters is the names, and that it isn't an integer.
        Assert.Multiple(() =>
        {
            Assert.That(mode["type"]?.GetValue<string>(), Is.Null.Or.EqualTo("string"), $"mode schema: {mode.ToJsonString()}");
            Assert.That(
                mode["enum"]?.AsArray().Select(value => value!.GetValue<string>()) ?? Enumerable.Empty<string>(),
                Is.EquivalentTo(new[] { "Insert", "Selection", "All" }),
                $"mode schema: {mode.ToJsonString()}");
        });
    }

    /// <summary>C-OAS-2: both operations are published, and each requires backoffice sign-in.</summary>
    [TestCase("GetConfig")]
    [TestCase("PostAiCompletion")]
    public async Task Document_PublishesOperationWithSecurity(string operationId)
    {
        JsonObject document = await GetDocumentAsync();

        JsonObject? operation = document["paths"]!.AsObject()
            .SelectMany(path => path.Value!.AsObject().Select(method => method.Value!.AsObject()))
            .FirstOrDefault(op => op["operationId"]?.GetValue<string>() == operationId);

        Assert.That(operation, Is.Not.Null, $"Operation {operationId} isn't in the document.");
        Assert.That(operation!["security"]?.AsArray(), Is.Not.Null.And.Not.Empty, $"Operation {operationId} has no security requirement.");
    }
}
