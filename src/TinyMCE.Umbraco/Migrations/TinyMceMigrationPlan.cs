using Umbraco.Cms.Core.Packaging;

namespace TinyMCE.Umbraco.Migrations;

internal sealed class TinyMceMigrationPlan : PackageMigrationPlan
{
    public override string InitialState => Guid.Empty.ToString();

    public TinyMceMigrationPlan()
        : base("TinyMCE_FirstBoot")
    { }

    protected override void DefinePlan()
    {
        From(InitialState)
        .To<RegisterUmbracoPackageEntry>(RegisterUmbracoPackageEntry.State)
        ;
    }
}
