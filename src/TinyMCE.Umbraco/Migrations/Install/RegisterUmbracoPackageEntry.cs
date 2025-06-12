using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Packaging;

namespace TinyMCE.Umbraco.Migrations;

internal sealed class RegisterUmbracoPackageEntry : AsyncPackageMigrationBase
{
    public static readonly Guid State = new("54E3474C-0F11-4AA7-9189-88F7EFE1359C");

    public RegisterUmbracoPackageEntry(
            IPackagingService packagingService,
            IMediaService mediaService,
            MediaFileManager mediaFileManager,
            MediaUrlGeneratorCollection mediaUrlGenerators,
            IShortStringHelper shortStringHelper,
            IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
            IMigrationContext context,
            IOptions<PackageMigrationSettings> packageMigrationsSettings)
            : base(
                packagingService,
                mediaService,
                mediaFileManager,
                mediaUrlGenerators,
                shortStringHelper,
                contentTypeBaseServiceProvider,
                context,
                packageMigrationsSettings)
    { }

    protected override Task MigrateAsync()
    {
        // we don't actually need to do anything, but this means we end up
        // on the list of installed packages. 
        // see: https://dev.to/kevinjump/put-your-package-in-the-installed-package-list-in-umbraco-9-11cg

        return Task.CompletedTask;
    }
}
