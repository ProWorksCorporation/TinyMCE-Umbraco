# CLAUDE.md - TinyMCE.Umbraco.Client

This file provides guidance to Claude Code when working with the **TinyMCE.Umbraco.Client** TypeScript/Vite project.

## Project Overview

This is the frontend backoffice package that provides the TinyMCE Rich Text Editor UI for Umbraco CMS. Built with TypeScript, Lit web components, and Vite. It produces both:
1. Static assets bundled into the main TinyMCE.Umbraco package
2. An NPM package (`@tiny-mce-umbraco/backoffice`) for extension developers

## Common Commands

**Prerequisites**: Node.js 24.13+ and npm 11+, required by `@umbraco-cms/backoffice` 17.6.2. npm only emits an `EBADENGINE` warning on an older Node rather than failing, so verify with `node --version` before debugging a build failure.

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
- `src/tinymce-lib-manifests.ts` - the `TinyMCE.Lib` bundle. Deliberately inert since 17.6.3 — see *Which TinyMCE Core Wins*

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

This enables authenticated API calls to `/umbraco/tiny-mce/api/v1/config`.

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
npm run generate-client https://localhost:44308/umbraco/swagger/tiny-mce/swagger.json
```

This generates code in `src/api/` that provides type-safe API calls.

## Which TinyMCE Core Wins

**`overwrites` does nothing for `type: "bundle"` extensions.** Only `UmbBaseExtensionsInitializer` — what
extension *slots* use — honours it. `UmbBundleExtensionInitializer` subscribes straight to
`extensionRegistry.byType('bundle')`, and `byType` → `#extensionsOfType` is a plain
`exts.filter(ext => ext.type === type)`. So a site's on-premises/CDN bundle declaring
`overwrites: "TinyMCE.Lib"` never suppressed ours; both loaded.

This is not a recent regression and is not version-specific — do not "wait for Umbraco to fix it". The
`bundle` extension type landed 2023-06-05 (`e5cdf7d369f`); `overwrites` landed 2023-07-27 (`2d686cf3212`)
in the *extensions controller*, i.e. the slot side, and was never wired into any initializer. `git log -S
overwrites` over `libs/extension-api/initializers/*` across all history returns nothing, and the bundle
initializer reads `overwrites: 0` at 15.0.0, 16.0.0, 17.0.0 and 17.6.2. (14.x cannot be checked from the
Umbraco-CMS clone — `Umbraco.Web.UI.Client` was still a submodule at `release-14.0.0` — but the file has
no overwrites-related commit in its history, so it behaved the same.)

That mattered because TinyMCE's UMD ends with an unconditional `window.tinymce = e, window.tinyMCE = e`,
and bundles are imported concurrently from one `Promise.allSettled` in `UmbExtensionInitializerBase`. The
last core to *finish downloading* silently won — a ~768KB local file against a CDN round trip, so it
flipped with cache state. Symptom: a blank RTE on a cold start that a hard refresh fixed, with no error
and no request for skin assets, because the packaged v6 core was handed the configured v8 `base_url`
(issue #225).

**The invariant now: nothing loads a TinyMCE core eagerly.** `src/tinymce-lib-manifests.ts` is inert, and
`loadTinyMce()` in `src/external/tinymce/index.ts` imports the packaged core on demand *only if*
`window.tinymce` is unset. This is safe precisely because Umbraco's app element gates its routes on
`UmbBundleExtensionInitializer.loaded`, so every bundle has provably run before any property editor does.

Two things to keep in step:
- **Never reintroduce a top-level `import 'tinymce'`** anywhere reachable from a bundle or manifest entry.
  Check after a build: only `tinymce.js` may reference the core chunk (`grep -l tinymce-<hash> *.js` in
  `wwwroot/App_Plugins/TinyMCE.Umbraco`). If `manifests.js` or `tinymce-lib-manifests.js` reaches it, the
  race is back and nothing will fail visibly on a default install — only on sites overriding the core.
- **`export const tinymce` is a `Proxy` over `window.tinymce`, not a snapshot.** It has to be: the core may
  not exist when the module evaluates. Any consumer that reads it at *module scope* will get `undefined`
  properties — that is what broke the toolbar-configuration property editor, which used to do
  `tinymce.IconManager.get('default')` at the top of the file and now awaits `loadTinyMce()` in
  `firstUpdated`. Read it from inside a method, or await the loader first.

## TinyMCE iframe Module Scope

**CRITICAL**: TinyMCE renders its content area inside an **iframe**. ES modules are per-realm, so the iframe gets its own module-level singletons — completely separate from the outer document's instances. The `umb-rte-block` and `umb-rte-block-inline` custom elements (block editor entries) live inside this iframe.

Two per-realm **singletons** are bridged in `init_instance_callback` in `src/components/input-tiny-mce/input-tiny-mce.defaults.ts`, and — a separate concern with the same root cause — a set of **custom element definitions** has to be forced into the inner realm as well (covered under point 2):

**1. `umbLocalizationManager`** (localization keys):
- Any localization keys needed by code running inside the iframe must be explicitly synced into the iframe's `umbLocalizationManager`.
- The sync reads from the outer `umbLocalizationManager.localizations` and injects a module script that calls `registerLocalization()` for each locale's relevant keys.
- If you add new features inside `umb-rte-block` that depend on localization, add the required keys to `BLOCK_LOC_KEYS` in that function.
- **Current members (4)**: `blockEditor_confirmDeleteBlockTitle`, `blockEditor_confirmDeleteBlockMessage`,
  `blockEditor_unsupportedBlockName`, `blockEditor_unsupportedBlockDescription`.
- The unsupported-block pair was added in the **Umbraco 17.6.2 upgrade**. Umbraco 17.6 completed a feature
  that was stubbed in 17.5 (`// TODO: Missing unsupported rendering` in `block-rte-entry.element.ts`), so
  `<umb-unsupported-rte-block>` now renders inside the iframe when a block's element type has been deleted.
  It calls `localize.term()` for both keys; without them the placeholder rendered with a blank name and
  blank description. The keys already existed in Umbraco's translation files — only the component reading
  them was new, which is exactly the failure mode this warning is about.
- **Check this list on every Umbraco minor upgrade.** Nothing automated catches a missing key: the sync
  loop silently skips keys it does not find, so the symptom is blank UI inside the editor, never an error.
  Diffing Umbraco's `block-rte` and `block` packages for new `localize.term(` calls is the reliable check.
- **The active language is bridged separately from the dictionaries, and must go through the registry.**
  Copying the locale sets across is only half the job — `UmbLocalizationController` picks a set using
  `umbLocalizationManager.documentLanguage`, so if that is wrong inside the iframe every lookup falls
  through `primary -> secondary -> en` and the synced translations render in English. Set it with
  `umbLocalizationRegistry.loadLanguage(outerLang)`, importing `@umbraco-cms/backoffice/localization`
  in the injected script, **not** by assigning `documentLanguage` directly. The registry is a module
  side-effect; the sibling `block-rte` script pulls it into the iframe realm, and constructing it emits
  its `'en'` bootstrap value, whose `tap` overwrites a direct assignment. Both injected scripts are
  created with `createElement('script')` and are therefore `async` with no guaranteed execution order,
  so importing the registry in our own script — which constructs it before our body runs — is what makes
  the result deterministic rather than a race. `documentDirection` still needs a direct assignment:
  only `#setBrowserLanguage` sets it, and that pipeline stops at its extension-length guard in this
  realm, where no `localization` manifests are registered. Symptom when this regresses: the iframe is
  English while the rest of the backoffice is translated — invisible to an English-only test pass.

**2. `umbExtensionsRegistry`** (extension manifests for block actions):
- `umb-block-action-list` (new in Umbraco 17.5.0) reads `umbExtensionsRegistry` as a direct module-level import — not via context — so the context proxy cannot bridge it.
- Two things are required in the injected module script:
  1. Import `UMB_BLOCK_ACTION_DEFAULT_KIND_MANIFEST` from `@umbraco-cms/backoffice/block` **in the inner realm** and register it into the inner registry. Because the import runs in the inner realm, the manifest's `element` factory (`() => import('./block-action.element.js')`) captures the inner realm's module URL — so when the extension system later calls it, `<umb-block-action>` is lazily registered in the inner `customElements`.
  2. The outer `umbExtensionsRegistry` reference is exposed on `window._umbOuterExtReg`, then read via `window.parent._umbOuterExtReg` in the injected script. The `blockAction` manifests (registered by Umbraco's package loader, not by module import) are copied into the inner registry so `umb-block-action-list` can discover them.
  3. **The `condition` extensions those actions name must be copied too.** A `blockAction` manifest
     declares its `conditions` by alias, and the extension system resolves each alias against the
     registry the action was registered in. Copy the actions without the conditions and every
     *conditional* action stays permanently un-initialized, with no error: `delete`, `edit-content`,
     `edit-settings` and `expose-content` all have conditions and silently vanish, while
     `copy-to-clipboard` (the only one with none) renders — so the action bar looks present but
     nearly empty. Derive the aliases from the copied manifests
     (`blockActions.flatMap(a => (a.conditions ?? []).map(c => c.alias))`) rather than hard-coding
     them, so an action that gains a condition in a later Umbraco version needs no change here.
- **Custom elements that Umbraco's components render must be *defined* in the inner realm.** Element
  registration is per-realm just like module singletons, and an undefined custom element is inert
  rather than an error: lit property bindings (`.name=${...}`) still set their expandos, so the element
  looks correctly configured in DevTools while rendering nothing. `umb-ref-rte-block` renders
  `<umb-icon>` for the block's element-type icon, and `block-rte` does **not** pull it in transitively,
  so the injected script imports `@umbraco-cms/backoffice/components` — the whole barrel, because the
  export map exposes no narrower path (`./icon` is the icon *registry*, and the deep
  `packages/core/components/icon` path is not exported, so it cannot resolve through the importmap).
  Note this is unrelated to the `UUIIconRequestEvent` proxy below, which works correctly: `uui-icon`
  *is* defined in the inner realm, and the action-bar icons resolve through that proxy fine. A blank
  icon means a missing element definition, not a failed icon request.
- **The `ufm-*` elements need a different mechanism — a barrel import will not reach them.** A block
  label written as `{=alias}` (also `{#term}`, `{umbValue:…}`) parses correctly and emits
  `<ufm-label-value alias="…">`, which then never upgrades and renders nothing. Unlike `umb-icon`, these
  are not exported from any importable barrel: the outer document defines them lazily by running the
  `api()` closure on each `ufmComponent` manifest. The injected script therefore imports
  `/umbraco/backoffice/packages/ufm/umbraco-package.js` — a stable URL whose `api()` closures resolve
  their own hashed chunks relative to whichever realm imports the module — and awaits each one. Three
  things to know before touching it:
  1. The manifests are on that package's **`manifests`** export, **not `extensions`**, which is a single
     `bundle` wrapper. Filtering `extensions` for `ufmComponent` matches nothing and fails silently.
  2. It is the only **top-level `await`** in the injected script, so it must stay **last**: anything
     after it waits on a dynamic import plus one `api()` call per component. Custom element upgrade is
     retroactive, so defining these after the registry syncs costs nothing.
  3. It is wrapped in try/catch at both levels, so a restructured `ufm` package degrades labels back to
     blank rather than breaking the editor. **That means a regression here is silent** — see the testing
     note in the checklist below.
  Contributed as PR #228 (fixes #227); the surrounding `umb-icon` and condition-sync fixes were developed
  here independently and kept in this branch's form.
- If new Umbraco versions introduce other per-realm singletons that components inside the iframe need, apply the same pattern: expose on `window`, read via `window.parent` in the injected script.

**Upgrade checklist for this section.** Every failure mode here is silent — blank UI, missing chrome,
or English text, never an exception — so none of it surfaces without deliberate checking. On each
Umbraco minor, for anything rendered inside the editor:
1. New `localize.term(` calls in Umbraco's `block-rte`/`block` packages → add keys to `BLOCK_LOC_KEYS`.
2. New or changed `conditions` on `blockAction` manifests → confirmed covered by the alias-derived copy.
3. New custom elements rendered by block components → confirm they are defined in the inner realm.
4. New `ufmComponent` manifests in Umbraco's `ufm` package → nothing to change (the loop takes whatever
   the package exports), but confirm the export is still called `manifests` and still carries `api()`
   closures. 17.6.2 ships **five**: `label-value`, `localize`, `content-name`, `link`, `member-name`.
5. Test with a **non-English** backoffice. An English-only pass cannot distinguish a working
   localization bridge from a broken one.
6. **Test block labels with `{=alias}` on a *classic* data type.** This one cost two false passes during
   the 17.6.2 upgrade, because two near-identical-looking tests exercise none of this code:
   - a `${ … }` label resolves through `umb-ufm-js-expression`, which **is** in `block-rte`'s static
     import graph and was never broken; and
   - an **inline** data type has no iframe at all, so `init_instance_callback` returns at its first line
     and not one of these bridges runs (see *Inline Mode and Shadow DOM* below).

   Only `{=alias}` in classic mode touches the iframe's custom element registry. Checking the label
   merely *appears* is not enough either — confirm the element upgraded **and** resolved its value, e.g.
   `editor.iframeElement.contentWindow.customElements.get('ufm-label-value')` is defined and the
   rendered text is the property's value, not empty.

**Context proxy** (`UMB_CONTEXT_REQUEST_EVENT_TYPE`): events bubble from the iframe's document, the proxy re-dispatches them on `editor.iframeElement` in the outer document, allowing block components to consume contexts (clipboard, property editor, etc.) that are provided in the outer document's DOM tree.

## Inline Mode and Shadow DOM

**CRITICAL, and the mirror image of the iframe section above.** Everything above applies to *classic*
mode, where the content area is an iframe and the problem is that the iframe is a separate realm. Inline
mode (`mode: "Inline"` on the Data Type) has **no iframe**: the target element itself becomes the editable
body, so none of the realm bridging applies — and a different problem takes its place.

The back-office renders each property editor inside deeply nested shadow DOM — the editable element sits
**more than twenty shadow roots** below the document (`umb-input-tiny-mce` → … → `umb-app`). TinyMCE's
shadow DOM support covers iframe mode; several of the DOM APIs it relies on internally do not cross a
shadow boundary, and each failure is **silent** — no exception, just an editor that looks fine and does
nothing. Three are bridged in `src/components/input-tiny-mce/shadow-dom-selection.ts`, applied from
`#onInit` in `input-tiny-mce.element.ts` and **only for inline editors**:

1. **`window.getSelection()`** — TinyMCE reads the caret through `win.getSelection()` (`getSel` in
   `Selection.getRng`). A window selection never descends into a shadow root, so it returns a range
   anchored at the host document's `<body>`. Symptom: the field takes focus and shows its toolbar, but
   nothing can be typed or pasted into it. Bridged with `ShadowRoot.getSelection()`, and **only while an
   inline editor actually holds focus** — resolved live via `root.activeElement === body` on each call,
   never cached from a focus/blur event. TinyMCE moves the selection at moments when its own focus
   bookkeeping is mid-flight, and a stale flag there sends `setRng` to the wrong selection.
2. **`document.contains()`** — `setRng` guards with `isValidRange` → `isAttachedToDom`, which asks
   `contains(node.ownerDocument, node)`; Sugar's `contains` is a plain `d1.contains(d2)`. Every range
   inside the editor is therefore judged *detached*, and `setRng` returns on its first line without even
   dispatching `SetSelectionRange`. Symptom: nothing that repositions the caret works — pressing Enter
   builds the new paragraph but leaves the caret on the old line. Overridden on the `document` object
   (not `Node.prototype`), turning only `false` into `true`, only for nodes inside a live inline editor.
3. **`DOMUtils.get(id)`** — this is `doc.getElementById(id)`, which cannot see into a shadow root. It
   breaks bookmarks: operations that restructure the DOM drop `<span data-mce-type="bookmark">` markers,
   rebuild, then call `moveToBookmark`, whose `restoreEndPoint` resolves them with `dom.get`. Symptom is
   twofold — the caret is not restored, **and the markers are never removed**, so they accumulate in the
   content one pair per edit and get saved into the field. Patched per-editor to look inside the editor
   body first, falling back to the native lookup.

**Consequences to keep in mind:**

- **Browser support: Chromium and Firefox yes, Safari no.** The three engines differ in how selection
  interacts with shadow DOM, and the bridge's fallback is load-bearing rather than a safety net:
  Chromium's `window.getSelection()` is shadow-blind but it implements `ShadowRoot.getSelection()`, which
  is the branch the bridge takes. **Firefox is the opposite** — no `ShadowRoot.getSelection()`, but its
  `window.getSelection()` already pierces shadow roots, so the `?? nativeGetSelection()` fallback returns
  the correct selection and the bridge effectively no-ops. Safari has neither, so nothing can bridge it.
  Do not "simplify" the fallback away: it is what makes Firefox work.
  `Selection.getComposedRanges()` is the standardised replacement for both branches and would likely
  cover Safari too — worth considering if Safari support is ever required.
- `init_instance_callback` in `input-tiny-mce.defaults.ts` **must** keep its `if (!editor.iframeElement)
  return;` guard. Its whole body bootstraps the iframe realm via `editor.dom.doc.head`, and in inline mode
  `editor.dom.doc` **is the back-office document** — without the guard it injects a duplicate import map
  and re-registers the `blockAction` manifests into the live registry, producing a wall of "import map
  rule … was removed" warnings and "Extension with alias … is already registered" errors.
- `height`/`width` (the **Dimensions** setting) are dropped for inline mode — TinyMCE ignores them without
  an editor chrome, and an unstyled empty target collapses to 0px. Sizing comes from the `.editor.inline`
  CSS rule in the component instead.
- `content_css` is never loaded in inline mode (no iframe document), and `body_class` is not applied — the
  component adds `umb-rte` to the element by hand to stand in for it.

**Upgrade checklist for this section.** All three bridges patch TinyMCE *internals*, so a TinyMCE major
bump (v7/v8, which this package supports via `tinyMceVersion`) can move them without any build error.
On each TinyMCE upgrade, re-check that `Selection.getRng`/`setRng` still route through `win.getSelection()`
and `isValidRange`, and that `DOMUtils.get` is still `doc.getElementById`. The only reliable test is manual
and in a browser: type, paste, press Enter twice, apply a list and a block format, then confirm
`editor.getBody().querySelectorAll('[data-mce-type="bookmark"]').length === 0`. Nothing here throws when it
regresses.

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
- `@umbraco-cms/backoffice` ^17.6.2
- `tinymce` and `tinymce-i18n` (ensures version compatibility)

**Dev Dependencies**: Vite, TypeScript, Rollup plugins, OpenAPI generator, etc.

## Common Tasks

### Adding a New Plugin

For a **custom** Umbraco-specific plugin:

1. Create plugin file in `src/plugins/`
2. Extend base plugin class from `src/plugins/core/`
3. Add manifest to `src/plugins/manifests.ts`
4. Export in main `src/manifests.ts`

For **exposing a plugin TinyMCE already ships** (fullscreen, help, searchreplace, …) there is no plugin
file to write — only step 3. The `tinyMcePlugin` manifest is the entire mechanism: it is what puts the
plugin in the Data Type's plugin picker and its button in the toolbar picker. Without one the plugin
files are still on disk and still shipped to `wwwroot/.../lib/plugins/`, but nothing in the back office
can select them, which is exactly how `fullscreen` came to be unavailable despite shipping (issue #223).

Three things to get right in the manifest:

- **`meta.plugins`** is the TinyMCE plugin name, and it must match a directory under
  `node_modules/tinymce/plugins/` (they are copied to `lib/plugins/` by the Vite static-copy step).
- **`meta.toolbar[].icon` is a *TinyMCE* icon name, not an Umbraco one.** The toolbar picker renders it
  via `tinymce.IconManager.get('default')`, so `icon-fullscreen` (an Umbraco icon) shows nothing —
  the correct value is `fullscreen`. Check names against `node_modules/tinymce/icons/default/icons.js`.
- **Premium plugins must also be listed in `defaultPremiumPluginsList`** in `input-tiny-mce.defaults.ts`,
  which is what strips them when no API key is present.

Keep the open-source list in `.github/README.md` in step — it is the only place users can see what is
selectable.

### Adding Configuration Option

1. Update backend `TinyMceConfig.cs` or `RichTextEditorSettings.cs`
2. Rebuild backend to update OpenAPI spec
3. Run `npm run generate-client` to update TypeScript types
4. Use new config in editor components
