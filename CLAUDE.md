# CLAUDE.md

# Claude Project Instructions

This file is the single source of truth for AI-assisted development in this repository.

If another file (such as AGENTS.md) references this document, this document takes precedence.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Umbraco CMS package that brings TinyMCE Rich Text Editor back to Umbraco. This branch is the **18 line**: the package requires Umbraco 18.3.0 or later and below 19 (its own `Umbraco.Cms.*` references are the range `[18.3.0, 19.0.0)`; the TestSite and `TinyMCE.Umbraco.Tests` run on the latest 18.x patch, 18.3.1). For Umbraco 16 use the 16.x package versions, for Umbraco 17 use 17.x (the `v17/*` branches); 17.x fixes reach this line by merging the 17.x release tag forward (`.github/RELEASING.md`). It replaces the default TipTap editor and supports both open-source and premium TinyMCE plugins. The package consists of three main projects:

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

**Requires Node.js 24.13+ and npm 11+** (the `@umbraco-cms/backoffice` 18.x floors, unchanged since 17.8.0). npm only warns on an older Node, it does not fail — so a stale toolchain shows up as a confusing build error rather than an install error.

```bash
cd src/TinyMCE.Umbraco.Client

# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Build the npm package (@tiny-mce-umbraco/backoffice) into dist-cms (clean, full build)
npm run build:api

# Generate the OpenAPI client from /umbraco/openapi/tiny-mce.json (test site must be running)
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
- **TinyMceConfig** - Enhanced configuration with features like `tinyMceUrl`, `tinyMceVersion`, `apikey`, `openAiApikey`, `sanitizeTinyMce`, `pluginsToExclude`, and nested `customConfig` JSON

The `TinyMceComposer` src/TinyMCE.Umbraco/Composing/TinyMceComposer.cs:14 is responsible for:
- Registering services and configuration bindings
- Binding nested JSON from `TinyMceConfig:customConfig` section using custom `ConfigurationBinder` that converts nested configuration into ExpandoObjects
- **Preventing TinyMCE to TipTap migration** by setting `TinyMceToTiptapMigrationSettings.DisableMigration = true` (critical for v16+ compatibility)

**The two `customConfig` sections are NOT bound the same way, and the difference is a trap.**
`TinyMceConfig:customConfig` gets the `BindToExpandoObject` treatment above, so nested objects and arrays
survive. `Umbraco:CMS:RichTextEditor:CustomConfig` does not — it is a plain
`.Configure<RichTextEditorSettings>(...)` into an `IDictionary<string, object>`
(`Configuration/RichTextEditorSettings.cs:133`), where a value written as a real JSON array has no scalar
for the binder and arrives as an object instead of a list. A list has to be written as an escaped JSON
*string* there (`"plugins": "[\"fullscreen\"]"`), which `parseJsonStringValues` in
`input-tiny-mce.element.ts` parses back. Passing the un-parsed object on to TinyMCE crashes editor
construction outright, which is why `mergeArrays` filters to strings — see its comment.

**Precedence, when the same key is set in more than one place**: `umbDeepMerge(source, fallback)` takes
the *source* as the winner, and every `customConfig` is merged in as the source — so configuration
overwrites the Data Type's value. `plugins` is the single deliberate exception, unioned across all
sources by an explicit assignment after the merge. The user-facing statement of this is under
[How CustomConfig combines with Data Type settings](.github/README.md#how-customconfig-combines-with-data-type-settings);
keep the two in step.

**API Controllers**: Located in `src/TinyMCE.Umbraco/Api/Management/Controllers/`, these expose Umbraco Management API endpoints for TinyMCE configuration. They inherit from `TinyMceManagementApiControllerBase` and are described in the package's OpenAPI document (below).

**OpenAPI (Umbraco 18)**: the document is registered in `TinyMceComposer` with Umbraco 18's own `builder.AddBackOfficeOpenApiDocument(Constants.ProjectAlias, …)` — Swashbuckle, `TinyMceConfigureSwaggerGenOptions` and `TinyMceOperationIdHandler` are gone. It is served at `/umbraco/openapi/tiny-mce.json` and listed as "TinyMCE Management API" in the UI at `/umbraco/openapi/` (there is no `/umbraco/swagger/` any more). The document is registered **`.WithJsonOptions(Constants.JsonOptionsNames.BackOffice)`**, the same JSON options the controllers respond with (`[JsonOptionsName]` on the base controller) — without it the schema is generated with default options and describes enums such as `RichTextEditorCommand.Mode` as integers while the server sends strings. Umbraco registers its own Management API document the same way. `OpenApiDocumentTests` pins this.

**`SanitizeTinyMce`** is no longer read from `Umbraco:CMS:Global` (Umbraco 18 removed that setting); it is `TinyMceConfig:sanitizeTinyMce`.

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

These plugins use the base class in `src/TinyMCE.Umbraco.Client/src/plugins/core/` which provides common plugin infrastructure. A plugin that inserts markup must use `insertAtCaret` from there, never `editor.selection.setContent()`/`setNode()`: straight after a block the caret is TinyMCE's fake caret, and markup written into it is dropped on save (see the client CLAUDE.md).

**Before changing how the editor renders content, read `src/TinyMCE.Umbraco.Client/CLAUDE.md`.** It carries
three sections covering failure modes that produce **no error at all** — blank UI, missing chrome, dropped
keystrokes — and that this repository has now hit repeatedly:

- **Which TinyMCE Core Wins** — `overwrites` is ignored for `type: "bundle"` extensions, so a site
  supplying its own TinyMCE could not suppress ours and the two raced. Nothing may load a core eagerly
  any more; the invariant and the two ways to regress it are recorded there.
- **TinyMCE iframe Module Scope** — classic mode puts the content area in an iframe, which is a separate
  module realm *and* a separate custom element registry. Localization, extension manifests and element
  definitions all have to be bridged across explicitly.
- **Inline Mode and Shadow DOM** — inline mode has no iframe, so none of the above applies; instead the
  editable element sits deep in the backoffice's shadow DOM, where several DOM APIs TinyMCE relies on
  silently do not reach it, and where its floating toolbar cannot be positioned (so it renders into a
  container of ours).

The last two are mirror images, and a fix for one is usually irrelevant or actively wrong for the other.
All three carry a per-upgrade checklist, including which tests actually exercise them — several
plausible-looking tests exercise neither of the rendering ones.

**NPM Package Exports**: The client exports via `@tiny-mce-umbraco/backoffice`:
- `@tiny-mce-umbraco/backoffice/core` - Main exports (components, utils, constants)
- `@tiny-mce-umbraco/backoffice/external/tinymce` - TinyMCE types, the `tinymce` global (a live `Proxy`, not a snapshot) and `loadTinyMce()`

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

- The package targets .NET 10.0 and Umbraco 18.3.0+ (range `[18.3.0, 19.0.0)`); the TestSite runs 18.3.1
- Uses TinyMCE v6 by default but supports v7/v8 via configuration
- Frontend uses Lit elements and Umbraco's Web Components architecture
- TypeScript is configured with strict mode and experimental decorators
- All C# code uses nullable reference types enabled
- The test site includes example configurations for TinyMCE premium features (AI, mergetags, templates)
