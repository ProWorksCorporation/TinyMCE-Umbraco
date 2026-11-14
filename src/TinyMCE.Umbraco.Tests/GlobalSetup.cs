using NUnit.Framework;

// ReSharper disable once CheckNamespace

/// <summary>
///     Runs Umbraco's integration-test global set-up and tear-down for this assembly.
/// </summary>
/// <remarks>
///     NUnit only discovers <see cref="SetUpFixtureAttribute"/> classes in the test assembly itself, so Umbraco's own
///     <see cref="GlobalSetupTeardown"/> (in the <c>Umbraco.Cms.Tests.Integration</c> package) never runs on its own.
///     Without it, <c>GlobalSetupTeardown.TestConfiguration</c> stays null and every <c>ManagementApiTest&lt;T&gt;</c>
///     fails to build its host. This class has NO NAMESPACE so it applies to the whole assembly, as Umbraco's does.
/// </remarks>
[SetUpFixture]
public class TinyMceTestsGlobalSetup
{
    private readonly GlobalSetupTeardown _umbraco = new();

    [OneTimeSetUp]
    public void SetUp() => _umbraco.SetUp();

    [OneTimeTearDown]
    public void TearDown() => _umbraco.TearDown();
}
