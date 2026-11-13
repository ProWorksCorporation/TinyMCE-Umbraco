# Changelog

All notable changes to TinyMCE for Umbraco CMS are documented in this file. The NuGet package (`TinyMCE.Umbraco`)
and the npm package (`@tiny-mce-umbraco/backoffice`) share a version number, and each release's entry covers both.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project's version numbers
follow the Umbraco CMS major version they support.

## [Unreleased]

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

### Security

- The OpenAI API key is no longer sent to the browser. AI assistant requests now go through a backoffice-only server
  endpoint (CL-001).
- Documented the known advisories affecting the bundled TinyMCE 6 core and how to opt into TinyMCE 7/8.
