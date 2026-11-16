# Changelog

All notable changes to TinyMCE for Umbraco CMS are documented in this file. The NuGet package (`TinyMCE.Umbraco`)
and the npm package (`@tiny-mce-umbraco/backoffice`) share a version number, and each release's entry covers both.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project's version numbers
follow the Umbraco CMS major version they support.

## [18.3.1] - 2026-11-16

Brings the 18 line up to 17.8.1: every fix and feature from the 17.6.2, 17.6.3, 17.8.0 and 17.8.1 releases, on
Umbraco 18.3. The version number follows Umbraco 18.3.1; the package requires Umbraco 18.3.0 or later.

### Breaking / upgrade notes

- **Requires Umbraco 18.3.0 or later** (was 18.0.0); the Umbraco package range is `[18.3.0, 19.0.0)`, and the npm
  package's peer is `@umbraco-cms/backoffice ^18.3.0`. Upgrade `Umbraco.Cms` first: NuGet refuses this release on an
  older 18.x site (NU1605), and npm refuses it next to an older backoffice (ERESOLVE).
- **AI assistant requests now leave from the web server**, not the browser. Allow outbound access to `api.openai.com`.
  `openAiApikey` and the `openAi` settings are no longer part of the configuration response the backoffice receives.
- **npm package**: new exports `loadTinyMce()`, `resolveTinyMceLanguage()`, `addLanguagePackUrl()` and
  `LANGUAGE_PACK_PATH`; `tinymce` from `/external/tinymce` is now a live proxy of the global rather than a snapshot
  taken at import; `availableLanguages` now lists exactly the 66 language packs the package ships. The generated
  `RichTextEditorCommandModeModel` type changes from `number` to a string enum (`Insert`, `Selection`, `All`).
- **Upgrading a site from Umbraco 17 to 18 with this package isn't verified yet.** Upgrading from 18.0 is: Data
  Types and content come through unchanged. Until the 17 → 18 path is verified, try it on a copy of your database
  first.

### Added

- Automated server-side (NUnit) and in-browser editor test suites (`dotnet test`, `npm test`).
- The editor's toolbar, menus and dialogs follow the backoffice user's language (they were always in English). The
  translations come from the package itself, also when TinyMCE comes from Tiny Cloud or a configured `tinyMceUrl`. A
  `language` set in custom configuration still takes precedence.
- Inline mode works: text can be typed and pasted, and the toolbar sits above the editor while it has focus, staying
  at the top of the workspace as you scroll. Supported in Chromium-based browsers and Firefox; not in Safari.
- The `fullscreen` plugin can be selected in the Data Type plugin and toolbar pickers.
- Custom block views (`blockEditorCustomView` extensions) show for rich text blocks in classic mode too, including
  views registered from a bundle (#206).
- Document links keep their culture (`data-culture`): it is saved, reopens in the link picker on that language
  version, and is removed when the link changes to media or an external URL.
- The media picker remembers the last folder used from each TinyMCE Data Type for the rest of the backoffice session.

### Changed

- The bundled TinyMCE 6 core is loaded only when an editor needs it, and only if no other TinyMCE is already
  present, so a site that supplies its own TinyMCE (Tiny Cloud or `tinyMceUrl`) no longer has two cores racing (#225).
- A block whose type has **Display inline** switched on is inserted inline, in the text (`<umb-rte-block-inline>`),
  as in Umbraco's own editor (#224, PR #239). Blocks already in your content keep how they were inserted.
- API client authentication uses Umbraco's `configureClient` from a user entry point, so it follows token refreshes
  and re-logins.
- Picked stylesheets resolve against `Global:UmbracoCssPath` (default `/css`), as in Umbraco's own editor, and
  protocol-relative stylesheets (`//cdn…`) load (#222).
- TinyMCE editors appear in Umbraco's "Rich Content" group in the property editor picker, in every backoffice
  language.
- Development dependencies were updated to clear the npm audit findings that have a non-major fix, including the
  critical `dompurify` advisory in the copy `monaco-editor` pins (overridden to 3.4.18). None of these reach the
  shipped package. The bundled TinyMCE 6 advisories are unchanged and still documented in the README.

### Fixed

- The package's OpenAPI document (`/umbraco/openapi/tiny-mce.json`) describes `RichTextEditorCommand.mode` as the
  string enum the server actually sends instead of an integer. The document is generated with Umbraco's backoffice
  JSON options, as Umbraco's own Management API document is. The response itself is unchanged.
- Block icons, `{=alias}` labels, the Edit/Delete buttons and block names (in the delete dialog and clipboard
  entries) render inside the classic-mode editor (#227, #228).
- The block delete dialog uses Umbraco's own wording in every language (in Danish it read "Slet %0").
- The placeholder for a block whose element type was deleted shows its text.
- Pressing Escape in an editor dialog or menu inside a block's side panel closes only the dialog or menu, not the
  side panel.
- Table property dialog dropdowns are no longer clipped inside block side panels (#238).
- Media: dimensions chosen in "Edit selected media" are kept (#229); a caption edited in the editor is used;
  re-picking a captioned or linked image no longer wipes the surrounding content or drops the link; inserting an
  image no longer resizes a different image (a leftover `id="__mcenew"` is removed on save).
- A block, image or embed inserted straight after a block is saved; it showed in the editor but was left out of the
  saved content.
- Links: external links no longer store an invalid `type="external"`; local links written with URL-encoded braces
  reopen correctly in the link picker; editing a link through the picker is saved (also in inline mode) and can be
  undone; clicking a link in inline mode no longer takes the backoffice to a blank page.
- Switching a document's culture no longer copies the previous culture's text into the new culture's editor.
- Plugins declared only in `Umbraco:CMS:RichTextEditor:CustomConfig` load (#223), and a plugin listed in both
  configuration and a package manifest appears once in the Data Type plugin picker.
- PDF export and other downloads started in the editor work (they failed with a `SecurityError`).
- Ask AI's dialog is never wider than the editor, so its send button stays on screen.

### Security

- The OpenAI API key is no longer sent to the browser. AI assistant requests go through a backoffice-only server
  endpoint (CL-001).
- Documented the known advisories affecting the bundled TinyMCE 6 core, and how to opt into TinyMCE 7/8.

## [17.8.1] - 2026-11-15

### Changed

- The version number follows Umbraco 17.8.1. The package still requires Umbraco 17.8.0 or later: Umbraco 17.8.1
  changes only a database library (NPoco), so there is no need to upgrade Umbraco for this release.
- npm package: `availableLanguages` now lists exactly the language packs the package ships (66; it named 23 that
  didn't exist and missed 13 that did). New exports `resolveTinyMceLanguage()`, `addLanguagePackUrl()` and
  `LANGUAGE_PACK_PATH`.

### Fixed

- The editor's toolbar, menus and dialogs now follow the backoffice user's language; they were always in English
  (long-standing). The translations come from the package itself, also when TinyMCE comes from Tiny Cloud or a
  configured `tinyMceUrl`. A `language` set in custom configuration still takes precedence.
- Pressing Escape in an editor dialog or menu inside a block's side panel closes only the dialog or menu; it also
  closed the side panel, asking to discard the block's changes if it had been edited (long-standing).
- A block whose type has **Display inline** switched on is inserted inline, in the text (`<umb-rte-block-inline>`),
  as in Umbraco's own editor; since Umbraco 17.6 every new block was inserted as a separate block (#224, PR #239).
  Blocks already in your content keep how they were inserted.
- Custom block views (`blockEditorCustomView` extensions) now show for rich text blocks in classic mode, as they
  already did in inline mode and in Umbraco's own editor; classic mode always showed the standard block (#206). Views
  registered from a bundle (`element: () => import(...)`) also render with their styles there.
- The block delete dialog's heading names the block in Danish ("Slet %0" before). The package no longer replaces
  Umbraco's own wording for this dialog in any language.

## [17.8.0] - 2026-11-14

### Added

- Automated server-side (NUnit) and in-browser editor test suites (`dotnet test`, `npm test`).
- Document links keep their culture (`data-culture`): it is saved, reopens in the link picker on that language
  version, and is removed when the link changes to media or an external URL.
- The media picker remembers the last folder used from each TinyMCE Data Type for the rest of the backoffice session.

### Changed

- Requires Umbraco 17.8.0 or later (was 17.6.2). Upgrade `Umbraco.Cms` first: NuGet doesn't refuse this release on
  an older 17.x site, but quietly lifts only the Umbraco packages it depends on, leaving a mix of versions.
- Regenerated the Management API client with @hey-api/openapi-ts 0.99, as required by Umbraco 17.8.
- AI provider requests now originate from the web server; allow outbound access to api.openai.com.
- API client authentication now uses Umbraco's `configureClient` from a user entry point, so it follows token refreshes
  and re-logins.

### Fixed

- External links no longer store an invalid `type="external"` attribute; editing a link removes it.
- Local links written with URL-encoded braces now reopen correctly in the link picker.
- Editing an existing link through the link picker is now saved even when nothing else changes afterwards (in inline
  mode the edit could be lost), and can be undone.
- Table property dialog dropdowns are no longer clipped inside block side panels (#238) (long-standing).
- Protocol-relative editor stylesheets (`//cdn…`) load again, and stylesheets always resolve under the configured
  `UmbracoCssPath` on the Umbraco server.
- Switching the culture of a document no longer copies the previous culture's text into the editor of the new one
  (Umbraco 17.8 rebuilds the editor on a culture switch).
- In inline mode the toolbar no longer appears for a moment on focus and then disappears (reliably on a short or
  empty editor). It now sits above the editor while it has focus, pushing the content down, and stays at the top
  of the workspace as you scroll.
- A block, image or embed inserted straight after a block is saved; it showed in the editor but was left out of
  the saved content (long-standing).
- Ask AI's dialog is never wider than the editor, so its send button stays on screen in narrow windows and in
  block side panels (long-standing).
- In inline mode, clicking a link in the text to edit it no longer takes the backoffice to a blank page
  (long-standing).
- Inserting an image from the media picker no longer resizes a different image to the new one's proportions. Text
  saved in inline mode before 17.6.2 can carry the picker's temporary `id="__mcenew"` on an image, and the next
  insert sized that image instead; the id is now removed when the text is saved.
- In classic mode, block names reach the delete-block dialog and block clipboard entries again; with Umbraco 17.8
  they were empty ("Are you sure you want to delete this ?").

### Security

- The OpenAI API key is no longer sent to the browser. AI assistant requests now go through a backoffice-only server
  endpoint (CL-001).
- Documented the known advisories affecting the bundled TinyMCE 6 core and how to opt into TinyMCE 7/8.

## [18.0.0] - 2026-07-01

### Added

- Added `engines` field to `package.json` declaring `node >=24.13` and `npm >=11` requirements (inherited from `@umbraco-cms/backoffice@18.0.0`).

### Changed

- **Umbraco 18 target**: All NuGet and npm packages now target Umbraco 18.0.0 (`Umbraco.Cms.*` `[18.0.0, 19.0.0)`, `@umbraco-cms/backoffice ^18.0.0`).
- **OpenAPI infrastructure**: Replaced Swashbuckle (`Swashbuckle.AspNetCore`) with Umbraco 18's built-in `Microsoft.AspNetCore.OpenApi` integration. The OpenAPI UI is now served at `/umbraco/openapi/` (was `/umbraco/swagger/`). `TinyMceConfigureSwaggerGenOptions` and `TinyMceOperationIdHandler` have been removed; the composer now calls `builder.AddBackOfficeOpenApiDocument(...)`.
- **Management API route**: The TinyMCE config endpoint is now registered at `/umbraco/management/api/v1/tiny-mce/config` (was `/umbraco/tiny-mce/api/v1/config`).
- **TypeScript 6.0.3**: Frontend build toolchain upgraded from TypeScript 5.x to 6.0.3.
- **`@hey-api/openapi-ts` `^0.97.0`**: OpenAPI client generator upgraded from `^0.85.0` to `^0.97.0`; regenerated API client now exports `TinyMceService` (was `UndefinedService`).
- **NuGet dependency range**: Package references to Umbraco packages now use an explicit `[18.0.0, 19.0.0)` version constraint to prevent accidental resolution against Umbraco 19.x.

### Removed

- `SanitizeTinyMce` setting under `Umbraco:CMS:Global` — Umbraco 18 removed this CMS-level setting. Use `TinyMceConfig:sanitizeTinyMce` in `appsettings.json` instead.

### Breaking Changes (for consumers of `@tiny-mce-umbraco/backoffice`)

- **Node ≥ 24.13 and npm ≥ 11 required** at build time (matches Umbraco 18 backoffice peer requirements).
- **`@umbraco-cms/backoffice ^18.0.0` required** as a peer dependency (was `^17.1.0`).
- **`SanitizeTinyMce` under `Umbraco:CMS:Global` is no longer supported.** Move the setting to `TinyMceConfig:sanitizeTinyMce`.
