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

### Fixed

### Security
