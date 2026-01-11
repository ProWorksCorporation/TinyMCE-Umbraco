# CLAUDE.md

# Claude Project Instructions

This file is the single source of truth for AI-assisted development in this repository.

If another file (such as AGENTS.md) references this document, this document takes precedence.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Umbraco CMS package that brings TinyMCE Rich Text Editor back to Umbraco v16+ (targets v17.1.0). It replaces the default TipTap editor and supports both open-source and premium TinyMCE plugins. The package consists of three main projects:

- **TinyMCE.Umbraco** (.NET 10.0 / Razor SDK): Main NuGet package containing C# backend, API controllers, configuration, and compiled frontend assets
- **TinyMCE.Umbraco.Client** (TypeScript/Vite): Frontend backoffice package built with Lit elements and Umbraco's extension system
- **TinyMCE.Umbraco.TestSite** (.NET 10.0 / Web): Test Umbraco site for development with unattended install

## Common Commands

### Building the Solution

```bash
# Build entire solution
dotnet build src/TinyMCE.Umbraco.sln

# Build and pack the NuGet package
dotnet pack src/TinyMCE.Umbraco/TinyMCE.Umbraco.csproj -c Release

# Build just the main package
dotnet build src/TinyMCE.Umbraco/TinyMCE.Umbraco.csproj
```

### Frontend Development

```bash
cd src/TinyMCE.Umbraco.Client

# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Build API types (regenerate OpenAPI client)
npm run build:api

# Generate OpenAPI client from Swagger endpoint (test site must be running)
npm run generate-client
```

### Running the Test Site

```bash
cd src/TinyMCE.Umbraco.TestSite
dotnet run
```

The test site uses unattended install. Default credentials (from appsettings.json):
- Username: `admin@example.com`
- Password: `1234567890`

### Publishing NPM Package

```bash
cd src/TinyMCE.Umbraco.Client

# Build for NPM distribution
npm run build:api

# Pack the NPM package
npm run pack:api

# The package is published as @tiny-mce-umbraco/backoffice
```

## Architecture

### Backend (C#)

**Configuration System**: The package uses a dual configuration system to support both legacy Umbraco settings and new enhanced settings:

- **Umbraco:CMS:RichTextEditor** - Legacy TinyMCE configuration (Commands, Plugins, ValidElements, etc.) maintained for compatibility
- **TinyMceConfig** - Enhanced configuration with features like `tinyMceUrl`, `tinyMceVersion`, `apikey`, `openAiApikey`, `pluginsToExclude`, and nested `customConfig` JSON

The `TinyMceComposer` src/TinyMCE.Umbraco/Composing/TinyMceComposer.cs:14 is responsible for:
- Registering services and configuration bindings
- Binding nested JSON from `TinyMceConfig:customConfig` section using custom `ConfigurationBinder` that converts nested configuration into ExpandoObjects
- **Preventing TinyMCE to TipTap migration** by setting `TinyMceToTiptapMigrationSettings.DisableMigration = true` (critical for v16+ compatibility)

**API Controllers**: Located in `src/TinyMCE.Umbraco/Api/Management/Controllers/`, these expose Umbraco Management API endpoints for TinyMCE configuration. They inherit from `TinyMceManagementApiControllerBase` and use OpenAPI/Swagger for API documentation.

**Migrations**: The `TinyMceMigrationPlan` in `src/TinyMCE.Umbraco/Migrations/` handles installation steps when the package is first installed.

### Frontend (TypeScript)

**Build System**: Uses Vite with multiple entry points defined in vite.config.ts:
- Builds to `../TinyMCE.Umbraco/wwwroot/App_Plugins/TinyMCE.Umbraco`
- Copies TinyMCE core files and language files from node_modules to the output
- External dependencies on `@umbraco-cms/backoffice` are not bundled
- Outputs ES modules only

**Extension System**: The frontend uses Umbraco's manifest-based extension system. All manifests are aggregated in src/TinyMCE.Umbraco.Client/src/manifests.ts:9 from:
- Components (Lit elements)
- Entry points (initialization)
- Icons
- Localizations
- Property editors (TinyMCE RTE data type UI)
- Plugins (Umbraco-specific TinyMCE plugins like media picker, block picker)
- Stylesheets

**Property Editors**: The main property editor UI is in `src/TinyMCE.Umbraco.Client/src/property-editors/`. This includes:
- Config editor for Data Type settings
- Plugin configuration UI
- Toolbar configuration
- The actual TinyMCE editor wrapper

**TinyMCE Plugins**: Custom Umbraco-specific plugins located in `src/TinyMCE.Umbraco.Client/src/plugins/` extend TinyMCE with Umbraco backoffice features:
- Media picker integration
- Block picker integration
- Multi URL picker
- Embedded media
- Code editor

These plugins use the base class in `src/TinyMCE.Umbraco.Client/src/plugins/core/` which provides common plugin infrastructure.

**NPM Package Exports**: The client exports via `@tiny-mce-umbraco/backoffice`:
- `@tiny-mce-umbraco/backoffice/core` - Main exports (components, utils, constants)
- `@tiny-mce-umbraco/backoffice/external/tinymce` - TinyMCE type exports for extension developers

### Key Integration Points

**Configuration Flow**:
1. .NET configuration binds to `TinyMceConfig` and `RichTextEditorSettings`
2. API controllers expose configuration to frontend
3. Frontend fetches config via Management API
4. Property editor applies config when initializing TinyMCE instances

**Asset Pipeline**:
1. Client project builds TypeScript/Vite → outputs to main project's wwwroot
2. Main project includes wwwroot as static web assets
3. NuGet package includes these compiled assets
4. Umbraco serves from App_Plugins folder at runtime

**Plugin Extension Pattern**: Third parties can extend TinyMCE by:
1. Installing `@tiny-mce-umbraco/backoffice` from NPM
2. Importing base classes from the package
3. Creating custom plugins following Umbraco's extension manifest pattern
4. Registering via their own umbraco-package.json manifest

## Project-Specific Conventions

- The package targets .NET 10.0 and Umbraco 17.1.0
- Uses TinyMCE v6 by default but supports v7/v8 via configuration
- Frontend uses Lit elements and Umbraco's Web Components architecture
- TypeScript is configured with strict mode and experimental decorators
- All C# code uses nullable reference types enabled
- The test site includes example configurations for TinyMCE premium features (AI, mergetags, templates)
