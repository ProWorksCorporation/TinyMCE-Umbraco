<!--
SYNC IMPACT REPORT
==================
Version change: [unversioned template] → 1.0.0
Modified principles: N/A (initial fill from template)
Added sections:
  - Core Principles (6 principles): Code Quality & Conventions, Testing Standards,
    UX Consistency, Performance Requirements, Backward Compatibility,
    Umbraco Extension Best Practices
  - Security Requirements (new section)
  - Development Workflow (new section)
  - Governance
Removed sections: N/A (template placeholders replaced)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes required (Constitution Check section generic)
  - .specify/templates/spec-template.md ✅ no changes required
  - .specify/templates/tasks-template.md ✅ no changes required
Follow-up TODOs:
-->

# TinyMCE.Umbraco Constitution

## Core Principles

### I. Code Quality & Conventions

All code MUST follow the established language conventions for its project layer:

**C# (Backend)**
- Nullable reference types MUST be enabled; null-forgiveness operators (`!`) MUST be
  justified with a comment.
- Public API surface MUST use XML doc comments.
- No magic strings for configuration keys — use `nameof` or typed constants.
- Classes MUST have a single, clear responsibility; God classes are prohibited.

**TypeScript (Frontend)**
- Strict mode (`"strict": true`) MUST remain enabled in `tsconfig.json`.
- Experimental decorators are permitted only for Lit element definitions.
- `any` type MUST NOT be used; use `unknown` with runtime guards where the type cannot
  be statically determined.
- Exports from `@tiny-mce-umbraco/backoffice` MUST be stable, documented, and semver-
  versioned; internal helpers MUST NOT be re-exported.

**Lit / Web Components**
- All UI components MUST extend `UmbLitElement` or an Umbraco-provided base class.
- Shadow DOM encapsulation MUST be used; global style leakage is prohibited.
- Component properties that affect rendering MUST be declared with `@property` or
  `@state` decorators.

### II. Testing Standards

Testing is mandatory, not optional, and MUST cover all functional boundaries.

- **Unit tests** MUST cover all C# service methods and TypeScript utility functions
  that contain non-trivial logic.
- **Integration tests** MUST be run against the `TinyMCE.Umbraco.TestSite` for any
  feature touching the Management API, configuration pipeline, or TinyMCE init flow.
- **Component tests** MUST validate that Lit elements render correctly with expected
  props and emit expected events.
- Tests MUST be written (and verified to fail) before implementation when following a
  TDD workflow.
- The test site's unattended install MUST remain functional; any PR that breaks the
  test site startup is blocked from merge.
- New API endpoints MUST include at least one happy-path and one error-path integration
  test.

### III. UX Consistency

The TinyMCE backoffice experience MUST feel native to Umbraco's backoffice UI.

- All dialogs, overlays, and pickers MUST use Umbraco's modal/overlay system
  (`UmbModalManagerContext`) rather than custom implementations.
- Toolbar configuration, plugin toggles, and data-type settings MUST follow the same
  visual and interaction patterns as other Umbraco property editors.
- Localization MUST be used for all user-visible strings; hardcoded English strings in
  UI components are prohibited.
- Error messages presented to editors MUST be actionable (explain what went wrong and
  what the editor can do) — generic "Something went wrong" messages are prohibited.
- Icon usage MUST rely on Umbraco's icon registry or the package's registered custom
  icons; inline SVG outside the icon system is prohibited.

### IV. Performance Requirements

- The initial TinyMCE editor load (from page render to editor ready) MUST NOT exceed
  **3 seconds** on a local development machine with a warm browser cache.
- Frontend bundle entry points MUST use **lazy loading** for non-critical paths
  (plugin UIs, config editors) so that the main editor bundle remains lean.
- The compiled wwwroot output for the core editor entry point MUST NOT exceed
  **500 KB** (gzipped). Non-core entry points are exempt but MUST be reviewed on each
  major TinyMCE version bump.
- TinyMCE core files copied from `node_modules` MUST NOT be duplicated across builds;
  the Vite config MUST reference a single canonical output path.
- API calls from the frontend to the Management API MUST complete within **500 ms**
  under normal conditions; slow endpoints MUST be investigated and optimized before
  release.

### V. Backward Compatibility

Upgrade paths from Umbraco v13, v14, and v15 MUST remain functional.

- The legacy `Umbraco:CMS:RichTextEditor` configuration section MUST continue to be
  read and applied; its removal or renaming is a MAJOR breaking change requiring a
  major version bump and migration guide.
- The `TinyMceConfig` enhanced configuration section MAY add new keys in a MINOR
  release, but MUST NOT remove or rename existing keys without a deprecation cycle of
  at least one MINOR release.
- Database migrations in `TinyMceMigrationPlan` MUST be additive; destructive
  migrations (dropping columns, removing data) are prohibited without an explicit,
  documented upgrade procedure.
- The `TinyMceToTiptapMigrationSettings.DisableMigration = true` guard MUST remain
  in place to prevent accidental data migration to TipTap on v16+ upgrades.
- Any change to the `umbraco-package.json` manifest structure that affects installed
  instances MUST be accompanied by a migration or backward-compatible fallback.

### VI. Umbraco Extension Best Practices

This package MUST follow Umbraco 17's extension system conventions precisely.

- All extensions (property editors, plugins, icons, localizations) MUST be registered
  via the manifest system aggregated in `manifests.ts`; ad-hoc registration bypassing
  the extension registry is prohibited.
- Entry points MUST be minimal bootstrappers — business logic belongs in services or
  controllers, not in entry point callbacks.
- The `@tiny-mce-umbraco/backoffice` NPM package MUST export stable contracts for
  third-party plugin authors; any breaking change to exported types or base classes
  requires a MAJOR version bump.
- New Umbraco backoffice APIs introduced in v17 MUST be preferred over deprecated v14/
  v15 equivalents, but deprecated APIs MUST NOT be removed until the minimum supported
  Umbraco version is raised.
- `@umbraco-cms/backoffice` MUST remain an external dependency (not bundled) to avoid
  version conflicts with the host Umbraco installation.

## Security Requirements

- All Management API controllers MUST require backoffice authentication via Umbraco's
  authorization policy; unauthenticated endpoints are prohibited.
- API keys (`apikey`, `openAiApikey`) MUST be stored in server-side configuration only
  and MUST NOT be exposed to the browser or included in API responses.
- User-supplied HTML content processed by TinyMCE MUST be sanitized server-side before
  persistence using Umbraco's configured sanitization pipeline.
- Dependency updates for packages with known CVEs MUST be addressed within **14 days**
  of disclosure if a fix is available.
- The `valid_elements` / `extended_valid_elements` configuration MUST be reviewed on
  each major TinyMCE version bump to ensure no unintended XSS vectors are introduced.

## Development Workflow

- **Branch strategy**: Features branch from `main`; hotfixes use `hotfix/*` branches.
- **PR requirements**: All PRs MUST pass CI (build + tests) before merge. PRs that
  touch the API surface MUST include an update to the OpenAPI client if the Swagger
  output changes.
- **Frontend changes**: Any frontend change MUST be validated against the test site
  using `npm run dev` before submitting a PR. Production builds (`npm run build`) MUST
  succeed without warnings treated as errors.
- **NuGet packaging**: The NuGet package version MUST be kept in sync with the NPM
  package version to avoid consumer confusion.
- **Changelog**: Every PR MUST include a changelog entry under the appropriate
  Unreleased section (Added / Changed / Fixed / Removed).
- **Complexity justification**: Any architectural decision that deviates from the
  simplest possible approach MUST be documented in the relevant plan or ADR (Architecture
  Decision Record) before implementation begins.

## Governance

This constitution supersedes all other development practices and informal conventions
for the TinyMCE.Umbraco project. Amendments require:

1. A proposed change authored as a PR modifying this file.
2. Review and approval by at least one project maintainer.
3. Version bump per the semantic versioning rules defined below.
4. If principles are removed or redefined in a backward-incompatible way, a migration
   plan for existing specs and tasks MUST be included in the PR.

**Versioning policy**:
- MAJOR: Backward-incompatible governance changes — principle removal, redefinition
  that invalidates prior work, or security policy tightening that blocks existing flows.
- MINOR: New principle or section added; materially expanded guidance.
- PATCH: Clarifications, wording improvements, typo fixes.

**Compliance review**: All PR reviews MUST verify that the proposed changes satisfy the
applicable principles in this constitution. If a violation is necessary, it MUST be
documented in the PR's Complexity Tracking table with justification.

Use `CLAUDE.md` for runtime AI-assisted development guidance. Use this constitution for
governance and non-negotiable quality gates.

**Version**: 1.0.0 | **Ratified**: 2026-03-13 | **Last Amended**: 2026-03-13
