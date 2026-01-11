# CLAUDE.md - TinyMCE.Umbraco

This file provides guidance to Claude Code when working with the **TinyMCE.Umbraco** C# project.

## Project Overview

This is the main NuGet package project (.NET 10.0, Razor SDK) that provides the TinyMCE Rich Text Editor for Umbraco CMS v16+. It contains the backend API, configuration system, migrations, and hosts the compiled frontend assets from the TinyMCE.Umbraco.Client project.

## Building

```bash
# Build this project
dotnet build TinyMCE.Umbraco.csproj

# Build with Release configuration
dotnet build TinyMCE.Umbraco.csproj -c Release

# Pack as NuGet package
dotnet pack TinyMCE.Umbraco.csproj -c Release

# Pack with specific version
dotnet pack TinyMCE.Umbraco.csproj -c Release /p:Version=17.1.0
```

## Project Structure

```
TinyMCE.Umbraco/
├── Api/Management/           # Umbraco Management API integration
│   ├── Configuration/        # Swagger/OpenAPI setup
│   ├── Controllers/          # API controllers
│   └── Models/              # API response models
├── Composing/               # Umbraco composer for DI registration
├── Configuration/           # Configuration classes
├── Migrations/              # Umbraco migration plans
│   └── Install/            # Installation migrations
└── wwwroot/                # Static assets (compiled from Client project)
    └── App_Plugins/TinyMCE.Umbraco/
```

## Key Components

### Configuration System

The package implements a dual configuration approach:

1. **RichTextEditorSettings** (Configuration/RichTextEditorSettings.cs) - Mirrors Umbraco's legacy `Umbraco:CMS:RichTextEditor` config
2. **TinyMceConfig** (Configuration/TinyMceConfig.cs) - Enhanced configuration with `apikey`, `tinyMceUrl`, `openAiApikey`, and nested `customConfig`

Both are registered and bound in TinyMceComposer.cs:14 using `IOptions<T>` pattern.

**Critical Implementation Detail**: The `TinyMceComposer.Compose` method includes custom `ConfigurationBinder` logic (lines 54-152) that converts nested JSON configuration from `TinyMceConfig:customConfig` into ExpandoObjects. This allows arbitrary nested JSON structure while maintaining strong typing at the root level.

### API Controllers

**TinyMceConfigApiController** (Api/Management/Controllers/TinyMceConfigApiController.cs:11):
- Exposes GET `/umbraco/tiny-mce/api/v1/config` endpoint
- Returns `TinyMceConfigResponseModel` containing both configuration objects
- Uses ASP.NET Core API versioning (v1.0)
- Grouped under "TinyMCE" in Swagger UI
- Authenticated via Umbraco's backoffice auth

**Base Controller**: All controllers inherit from `TinyMceManagementApiControllerBase` which applies:
- `[TinyMceVersionedApiBackOfficeRoute]` attribute for routing
- Umbraco Management API conventions

### Migration System

**TinyMceMigrationPlan** (Migrations/TinyMceMigrationPlan.cs) orchestrates installation:
- Runs on first package installation
- **RegisterUmbracoPackageEntry** (Migrations/Install/RegisterUmbracoPackageEntry.cs) - Registers package metadata in Umbraco

### Preventing TipTap Migration

**CRITICAL**: The composer (Composing/TinyMceComposer.cs:46) explicitly disables Umbraco v16's TinyMCE-to-TipTap migration:

```csharp
.Configure<TinyMceToTiptapMigrationSettings>(settings => settings.DisableMigration = true)
```

This line is essential for the package to work correctly. Without it, Umbraco will attempt to migrate TinyMCE data types to TipTap.

## Dependencies

- `Umbraco.Cms.Web.Website` 17.1.0
- `Umbraco.Cms.Web.Common` 17.1.0
- `Umbraco.Cms.Api.Common` 17.1.0
- `Umbraco.Cms.Api.Management` 17.1.0
- Project reference to `TinyMCE.Umbraco.Client.esproj` (for asset compilation)

## Build Output

The project outputs to `wwwroot/App_Plugins/TinyMCE.Umbraco/` which includes:
- Compiled JavaScript from the Client project
- TinyMCE library files (copied during Client build)
- Localization files
- Manifest files for Umbraco's extension system

These assets are included in the NuGet package via static web asset conventions.

## Working with Configuration

When adding new configuration options:

1. Add property to `TinyMceConfig.cs` or `RichTextEditorSettings.cs`
2. Ensure binding is correct in `TinyMceComposer.cs`
3. Update `TinyMceConfigResponseModel.cs` if needed for API response
4. The frontend will receive changes via the `/config` endpoint

For nested JSON in `customConfig`, the ConfigurationBinder automatically handles conversion to ExpandoObjects.

## NuGet Package Configuration

Package metadata is defined in the `.csproj` file:
- PackageId: `TinyMCE.Umbraco`
- Title: `TinyMCE for Umbraco CMS`
- Includes `README_nuget.md` from docs folder
- Tagged for Umbraco Marketplace

## Testing Changes

After making changes to this project:

1. Rebuild the project
2. The Client project assets are automatically included if Client was built first
3. Run the TestSite project which references this project
4. Navigate to Settings > Data Types in Umbraco backoffice to test RTE configuration
