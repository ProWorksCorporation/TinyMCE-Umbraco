# Changelog

All notable changes to TinyMCE for Umbraco CMS are documented in this file. The NuGet package (`TinyMCE.Umbraco`)
and the npm package (`@tiny-mce-umbraco/backoffice`) share a version number, and each release's entry covers both.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project's version numbers
follow the Umbraco CMS major version they support.

## [Unreleased]

### Added

- Automated server-side (NUnit) and in-browser editor test suites (`dotnet test`, `npm test`).

### Changed

- Requires Umbraco 17.8.0 or later (was 17.6.2). Upgrade `Umbraco.Cms` first: NuGet doesn't refuse this release on
  an older 17.x site, but quietly lifts only the Umbraco packages it depends on, leaving a mix of versions.
- Regenerated the Management API client with @hey-api/openapi-ts 0.99, as required by Umbraco 17.8.
- AI provider requests now originate from the web server; allow outbound access to api.openai.com.

### Fixed

- External links no longer store an invalid `type="external"` attribute; editing a link removes it.
- Local links written with URL-encoded braces now reopen correctly in the link picker.
- Editing an existing link through the link picker is now saved even when nothing else changes afterwards (in inline
  mode the edit could be lost), and can be undone.

### Security

- The OpenAI API key is no longer sent to the browser. AI assistant requests now go through a backoffice-only server
  endpoint (CL-001).
