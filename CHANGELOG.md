# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ProWorksCorporation/TinyMCE-Umbraco/compare/release-18.0.0...HEAD
[18.0.0]: https://github.com/ProWorksCorporation/TinyMCE-Umbraco/releases/tag/release-18.0.0
