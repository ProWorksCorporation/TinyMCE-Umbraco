# CLAUDE.md - TinyMCE.Umbraco.Client

This file provides guidance to Claude Code when working with the **TinyMCE.Umbraco.Client** TypeScript/Vite project.

## Project Overview

This is the frontend backoffice package that provides the TinyMCE Rich Text Editor UI for Umbraco CMS. Built with TypeScript, Lit web components, and Vite. It produces both:
1. Static assets bundled into the main TinyMCE.Umbraco package
2. An NPM package (`@tiny-mce-umbraco/backoffice`) for extension developers

## Common Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build (outputs to ../TinyMCE.Umbraco/wwwroot/App_Plugins/TinyMCE.Umbraco)
npm run build

# Build API types from OpenAPI spec (requires test site running at https://localhost:44308)
npm run build:api

# Generate OpenAPI TypeScript client
npm run generate-client

# Create NPM package tarball
npm run pack:api
```

## Project Structure

```
src/
├── api/                     # Generated OpenAPI client
│   ├── client/             # Generated API client code
│   └── core/               # OpenAPI client core utilities
├── components/             # Lit web components
│   ├── input-tiny-mce/    # Main TinyMCE editor component
│   ├── stylesheet-rule-input/
│   └── stylesheet-rule-ref/
├── entry-points/           # Extension initialization
│   ├── entry-point.ts     # OAuth setup and API client config
│   └── manifest.ts        # Entry point manifest
├── external/              # External library type re-exports
│   └── tinymce/          # TinyMCE types for consumers
├── icons/                 # Icon manifests for Umbraco
├── localizations/         # Translation files
├── plugins/               # Custom TinyMCE plugins
│   ├── core/             # Plugin base classes
│   ├── tiny-mce-block-picker.plugin.ts
│   ├── tiny-mce-code-editor.plugin.ts
│   ├── tiny-mce-embeddedmedia.plugin.ts
│   ├── tiny-mce-mediapicker.plugin.ts
│   └── tiny-mce-multi-url-picker.plugin.ts
├── property-editors/      # Property editor components
│   ├── configEditor/     # Data Type config UI
│   ├── plugin/           # Plugin selection UI
│   ├── tiny-mce/         # Main RTE property editor
│   └── toolbar/          # Toolbar configuration UI
├── stylesheets/          # Stylesheet management
└── utils/                # Utility functions (image sizing, blob upload)
```

## Build System

### Vite Configuration (vite.config.ts)

**Entry Points**:
- `src/index.ts` - Main exports for NPM package
- `src/tinymce.ts` - TinyMCE library re-export
- `src/manifests.ts` - Extension manifests
- `src/tinymce-lib-manifests.ts` - TinyMCE library manifests

**Output**: `../TinyMCE.Umbraco/wwwroot/App_Plugins/TinyMCE.Umbraco`

**Static Asset Copying**:
- `node_modules/tinymce/*` → `lib/`
- `node_modules/tinymce-i18n/langs6/*` → `lib/langs/`

**External Dependencies**: `@umbraco-cms/backoffice` is marked external and not bundled

### NPM Package Exports

The package.json exports configuration:
```json
{
  "./core": "./dist-cms/index.js",
  "./external/tinymce": "./dist-cms/external/tinymce/index.js"
}
```

Extension developers import from `@tiny-mce-umbraco/backoffice/core` and `@tiny-mce-umbraco/backoffice/external/tinymce`.

## TypeScript Configuration

- Target: ES2020
- Strict mode enabled
- Experimental decorators enabled (for Lit)
- Module resolution: bundler mode
- Path aliases configured for internal imports and NPM package exports

## Extension System Architecture

### Manifest Aggregation

All extensions are aggregated in src/manifests.ts:9:
```typescript
export const manifests = [
  ...components,
  ...entryPoints,
  ...icons,
  ...localizations,
  ...propertyEditors,
  ...plugins,
  ...stylesheets,
];
```

Umbraco's backoffice loads these manifests to discover and register extensions.

### Entry Point (src/entry-points/entry-point.ts)

The `onInit` function:
1. Consumes Umbraco's `UMB_AUTH_CONTEXT`
2. Gets OAuth configuration from auth context
3. Configures the OpenAPI client with base URL and credentials
4. Adds request interceptor to inject Bearer token on every API call

This enables authenticated API calls to `/umbraco/management/api/v1/tiny-mce/config`.

## Custom TinyMCE Plugins

All plugins in `src/plugins/` extend TinyMCE with Umbraco-specific functionality:

- **Block Picker**: Integrates Umbraco's block picker into TinyMCE
- **Media Picker**: Native Umbraco media picker integration
- **Multi URL Picker**: Insert Umbraco links
- **Embedded Media**: Embed media items
- **Code Editor**: Enhanced code editing

**Plugin Base Class**: `src/plugins/core/` provides common infrastructure for plugins.

**Plugin Extension Pattern**: Each plugin exports as an Umbraco extension manifest and is registered in `src/plugins/manifests.ts`.

## Property Editors

The main property editor is `Umbraco.TinyMCE` (defined in Constants.cs in the C# project).

**Configuration UI** (`src/property-editors/configEditor/`):
- Allows Data Type-level customization
- Custom JSON config editor
- Plugin selection interface
- Toolbar configuration

**Editor Component** (`src/property-editors/tiny-mce/`):
- Wraps TinyMCE editor
- Handles initialization from configuration
- Manages Umbraco-specific integrations

## Utility Functions (src/utils/)

**Image Handling**:
- `sizeImageInEditor()` - Resizes images to max configured size
- `scaleToMaxSize()` - Calculates scaled dimensions
- `uploadBlobImages()` - Handles drag/drop and paste image uploads

**Blob Upload Flow**:
1. User pastes/drags image into editor
2. Image temporarily stored as `blob:` URL
3. `uploadBlobImages()` uploads to Umbraco temporary storage
4. Sets `data-tmpimg` attribute with temporary location
5. On save, RTE property editor converts to permanent media item

## API Client Generation

The `generate-client` script uses `@hey-api/openapi-ts` to generate TypeScript client from the Swagger endpoint:

```bash
npm run generate-client https://localhost:44308/umbraco/openapi/tiny-mce.json
```

This generates code in `src/api/` that provides type-safe API calls.

## TinyMCE iframe Module Scope

**CRITICAL**: TinyMCE renders its content area inside an **iframe**. ES modules are per-realm, so the iframe gets its own module-level singletons — completely separate from the outer document's instances. The `umb-rte-block` and `umb-rte-block-inline` custom elements (block editor entries) live inside this iframe.

Two per-realm singletons are currently bridged in `init_instance_callback` in `src/components/input-tiny-mce/input-tiny-mce.defaults.ts`:

**1. `umbLocalizationManager`** (localization keys):
- Any localization keys needed by code running inside the iframe must be explicitly synced into the iframe's `umbLocalizationManager`.
- The sync reads from the outer `umbLocalizationManager.localizations` and injects a module script that calls `registerLocalization()` for each locale's relevant keys.
- If you add new features inside `umb-rte-block` that depend on localization, add the required keys to `BLOCK_LOC_KEYS` in that function.

**2. `umbExtensionsRegistry`** (extension manifests for block actions):
- `umb-block-action-list` reads `umbExtensionsRegistry` as a direct module-level import — not via context — so the context proxy cannot bridge it.
- Two things are required in the injected module script:
  1. Import `UMB_BLOCK_ACTION_DEFAULT_KIND_MANIFEST` from `@umbraco-cms/backoffice/block` **in the inner realm** and register it into the inner registry. Because the import runs in the inner realm, the manifest's `element` factory (`() => import('./block-action.element.js')`) captures the inner realm's module URL — so when the extension system later calls it, `<umb-block-action>` is lazily registered in the inner `customElements`.
  2. The outer `umbExtensionsRegistry` reference is exposed on `window._umbOuterExtReg`, then read via `window.parent._umbOuterExtReg` in the injected script. The `blockAction` manifests (registered by Umbraco's package loader, not by module import) are copied into the inner registry so `umb-block-action-list` can discover them.
- If new Umbraco versions introduce other per-realm singletons that components inside the iframe need, apply the same pattern: expose on `window`, read via `window.parent` in the injected script.

**Context proxy** (`UMB_CONTEXT_REQUEST_EVENT_TYPE`): events bubble from the iframe's document, the proxy re-dispatches them on `editor.iframeElement` in the outer document, allowing block components to consume contexts (clipboard, property editor, etc.) that are provided in the outer document's DOM tree.

## Working with Components

All components use Lit web components with Umbraco's extension system:

1. Create component class extending `UmbLitElement` or similar
2. Define custom element with `@customElement` decorator
3. Create manifest in corresponding `manifests.ts`
4. Export manifest in main `manifests.ts`

## Development Workflow

1. **Make Changes**: Edit TypeScript/Lit components in `src/`
2. **Watch Build**: Run `npm run dev` for live rebuilds
3. **Test in TestSite**: Changes are automatically copied to `../TinyMCE.Umbraco/wwwroot/`
4. **Rebuild C# Project**: The C# project includes the wwwroot as static assets
5. **Test in Umbraco**: Run the TestSite and navigate to backoffice

## Publishing NPM Package

1. Update version in `package.json`
2. Run `npm run build:api` to build distributable
3. Run `npm pack` to create tarball
4. Publish to NPM registry

The package is consumed by developers extending TinyMCE with custom plugins.

## Dependencies

**Runtime**:
- `tinymce` ^6.8.5 - TinyMCE core library
- `tinymce-i18n` ^24.12.30 - Localization files

**Peer Dependencies**:
- `@umbraco-cms/backoffice` ^17.1.0
- `tinymce` and `tinymce-i18n` (ensures version compatibility)

**Dev Dependencies**: Vite, TypeScript, Rollup plugins, OpenAPI generator, etc.

## Common Tasks

### Adding a New Plugin

1. Create plugin file in `src/plugins/`
2. Extend base plugin class from `src/plugins/core/`
3. Add manifest to `src/plugins/manifests.ts`
4. Export in main `src/manifests.ts`

### Adding Configuration Option

1. Update backend `TinyMceConfig.cs` or `RichTextEditorSettings.cs`
2. Rebuild backend to update OpenAPI spec
3. Run `npm run generate-client` to update TypeScript types
4. Use new config in editor components
