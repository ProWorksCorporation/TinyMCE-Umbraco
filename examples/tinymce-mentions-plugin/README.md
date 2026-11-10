# Example: a TinyMCE Mentions plugin for TinyMCE.Umbraco

A small, complete extension built on [`@tiny-mce-umbraco/backoffice`](https://www.npmjs.com/package/@tiny-mce-umbraco/backoffice).
It shows how a third-party package plugs into the TinyMCE editor that TinyMCE.Umbraco provides.

## What it shows

- **A plugin class.** `mentions.tinymce-api.ts` default-exports a class extending `UmbTinyMcePluginBase` from
  `@tiny-mce-umbraco/backoffice/core`. Umbraco loads the default export as the plugin.
- **`extendEditorConfig`.** This static hook runs before each editor initialises, and adds TinyMCE's
  `mentions_fetch` option. `metions-request-factory.ts` returns the fetch handler: it filters three sample users
  by what was typed after `@`.
- **A premium TinyMCE plugin.** `mentions` is one of TinyMCE's premium plugins, so the editor needs a
  TinyMCE Cloud API key (`TinyMceConfig:apikey`) for the `@` menu to appear.

## How it's registered

The build writes `tinymce-mentions-plugin.js` into
[`src/TinyMCE.Umbraco.TestSite/wwwroot/App_Plugins/tinymce-mentions-plugin/`](../../src/TinyMCE.Umbraco.TestSite/wwwroot/App_Plugins/tinymce-mentions-plugin/).
The `umbraco-package.json` beside it registers a `tinyMcePlugin` extension that points at that file, and its
`meta.config.plugins` asks TinyMCE to load `mentions`. That manifest is maintained there by hand, not built.

## Type-check and build

```bash
cd examples/tinymce-mentions-plugin
npm install
npm run typecheck   # tsc --noEmit
npm run build       # vite build, into the TestSite's App_Plugins folder
```

`vite.config.ts` marks `@tiny-mce-umbraco/*` and `@umbraco-cms/*` as external. Both are provided by the backoffice at
runtime; bundling either one a second time causes duplicate custom element registrations.

## It is also a compatibility fixture

This example doubles as the package's third-party compatibility check. It depends on a **published** release of
`@tiny-mce-umbraco/backoffice`, pinned exactly, rather than on the source in this repository. At each package
upgrade, the example is type-checked against the new package before release, to confirm that an existing
extension still compiles. Only after that check passes is the pin bumped, as a deliberate change.
