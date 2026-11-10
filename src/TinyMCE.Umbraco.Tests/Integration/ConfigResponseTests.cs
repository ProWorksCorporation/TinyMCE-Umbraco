using System.Linq.Expressions;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using TinyMCE.Umbraco.Api.Management;
using Umbraco.Cms.Tests.Integration.ManagementApi;

namespace TinyMCE.Umbraco.Tests.Integration;

/// <summary>
///     Contract tests for <c>GET /umbraco/management/api/v1/tiny-mce/config</c>
///     (specs/004-upgrade-umbraco-17-8/contracts/config-response.md).
/// </summary>
[TestFixture]
public class ConfigResponseTests : ManagementApiTest<TinyMceConfigApiController>
{
    /// <summary>
    ///     The route the backoffice client calls. Requested literally rather than through the harness's <c>Url</c>:
    ///     Umbraco's <c>GetManagementApiUrl</c> throws <see cref="ArgumentNullException"/> for an action without a
    ///     <see cref="CancellationToken"/> parameter (it removes a <c>null</c> key), and <c>GetConfig()</c> has none.
    ///     Pinning the literal route also makes a route change fail here instead of only in the browser.
    /// </summary>
    private const string ConfigUrl = "/umbraco/management/api/v1/tiny-mce/config";

    /// <summary>A recognisable stand-in for the TinyMCE Cloud key, a public client identifier (constitution 1.2.0).</summary>
    private const string TinyCloudKey = "tiny-public-key-test";

    /// <summary>The same kind of key, set through Umbraco's legacy <c>RichTextEditor</c> section.</summary>
    private const string RichTextEditorCloudKey = "tiny-public-rte-key-test";

    protected override Expression<Func<TinyMceConfigApiController, object>> MethodSelector { get; set; } =
        x => x.GetConfig();

    [SetUp]
    public override void Setup()
    {
        // Supplied as real configuration, before the host is built, so these tests exercise TinyMceComposer's binding
        // of both sections rather than options set directly in the container. The harness builds one host per
        // fixture, so every test in this fixture sees these values.
        InMemoryConfiguration["TinyMceConfig:apikey"] = TinyCloudKey;
        InMemoryConfiguration["Umbraco:CMS:RichTextEditor:CloudApiKey"] = RichTextEditorCloudKey;

        base.Setup();
    }

    // Umbraco's harness only adds its own assemblies as MVC application parts; ours has to be added explicitly or
    // the controller is never routed. TinyMceComposer itself is found by the type loader's assembly scan.
    protected override void CustomMvcSetup(IMvcBuilder mvcBuilder) =>
        mvcBuilder.AddApplicationPart(typeof(TinyMceConfigApiController).Assembly);

    private async Task<JsonElement> GetConfigAsAdminAsync()
    {
        await AuthenticateClientAsync(Client, "admin@example.com", UserPassword, isAdmin: true);

        HttpResponseMessage response = await Client.GetAsync(ConfigUrl);
        string body = await response.Content.ReadAsStringAsync();

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), body);
        return JsonDocument.Parse(body).RootElement;
    }

    /// <summary>Harness proof (research R6): Umbraco boots with our composer and routes our controller.</summary>
    [Test]
    public async Task GetConfig_AsAdmin_Returns200()
    {
        await AuthenticateClientAsync(Client, "admin@example.com", UserPassword, isAdmin: true);

        HttpResponseMessage response = await Client.GetAsync(ConfigUrl);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), await response.Content.ReadAsStringAsync());
    }

    /// <summary>C-CFG-3: when configured, both TinyMCE Cloud keys are present with their values (FR-016).</summary>
    [Test]
    public async Task GetConfig_ReturnsConfiguredTinyCloudKeys()
    {
        JsonElement root = await GetConfigAsAdminAsync();

        Assert.That(root.GetProperty("config").GetProperty("apikey").GetString(), Is.EqualTo(TinyCloudKey));
        Assert.That(
            root.GetProperty("richTextEditor").GetProperty("cloudApiKey").GetString(),
            Is.EqualTo(RichTextEditorCloudKey));
    }

    /// <summary>C-CFG-4: an unauthenticated request is refused, and the refusal carries no configuration.</summary>
    [Test]
    public async Task GetConfig_Unauthenticated_Returns401WithoutConfiguration()
    {
        HttpResponseMessage response = await Client.GetAsync(ConfigUrl);
        string body = await response.Content.ReadAsStringAsync();

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), body);
        Assert.That(body, Does.Not.Contain(TinyCloudKey));
        Assert.That(body, Does.Not.Contain(RichTextEditorCloudKey));
        Assert.That(body, Does.Not.Contain("richTextEditor"));
    }

    /// <summary>
    ///     C-CFG-5: every property the frontend reads is present with the same JSON type (research R3 "sent" rows), so
    ///     the regenerated client keeps compiling.
    /// </summary>
    [TestCase("richTextEditor", "commands", JsonValueKind.Array)]
    [TestCase("richTextEditor", "plugins", JsonValueKind.Array)]
    [TestCase("richTextEditor", "customConfig", JsonValueKind.Object)]
    [TestCase("richTextEditor", "validElements", JsonValueKind.String)]
    [TestCase("richTextEditor", "invalidElements", JsonValueKind.String)]
    [TestCase("richTextEditor", "cloudApiKey", JsonValueKind.String)]
    [TestCase("config", "apikey", JsonValueKind.String)]
    [TestCase("config", "tinyMceVersion", JsonValueKind.String)]
    [TestCase("config", "tinyMceUrl", JsonValueKind.String)]
    [TestCase("config", "pluginsToExclude", JsonValueKind.Array)]
    [TestCase("config", "sanitizeTinyMce", JsonValueKind.True)]
    [TestCase("config", "customConfig", JsonValueKind.Object)]
    public async Task GetConfig_SentPropertyIsPresentWithItsType(string parent, string property, JsonValueKind kind)
    {
        JsonElement root = await GetConfigAsAdminAsync();

        Assert.That(root.TryGetProperty(parent, out JsonElement parentElement), Is.True, $"missing '{parent}'");
        Assert.That(
            parentElement.TryGetProperty(property, out JsonElement value),
            Is.True,
            $"missing '{parent}.{property}'");
        Assert.That(value.ValueKind, Is.EqualTo(kind), $"'{parent}.{property}'");
    }

    /// <summary>C-CFG-5, the shape of each command (an array of objects the toolbar configuration UI may read).</summary>
    [Test]
    public async Task GetConfig_CommandsHaveAliasNameAndMode()
    {
        JsonElement root = await GetConfigAsAdminAsync();
        JsonElement commands = root.GetProperty("richTextEditor").GetProperty("commands");

        Assert.That(commands.GetArrayLength(), Is.GreaterThan(0));
        foreach (JsonElement command in commands.EnumerateArray())
        {
            Assert.That(command.GetProperty("alias").ValueKind, Is.EqualTo(JsonValueKind.String));
            Assert.That(command.GetProperty("name").ValueKind, Is.EqualTo(JsonValueKind.String));
            Assert.That(command.TryGetProperty("mode", out _), Is.True);
        }
    }
}
