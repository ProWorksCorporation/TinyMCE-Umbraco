# Contributing Guidelines

Contributions to this package are most welcome! 

## Prerequisites

- **.NET SDK 10.0 or later** — the projects target `net10.0`.
- **Node.js 24.13+ and npm 11+** — required by `@umbraco-cms/backoffice` 17.8.0, which the frontend
  builds against. On an older Node, npm emits only an `EBADENGINE` *warning* rather than failing, so
  the install appears to succeed and the build breaks later in confusing ways. Check with
  `node --version` and `npm --version` before reporting a build problem.
- **Umbraco 17.8.0 or later** if you are testing against your own site. The bundled test site is
  already pinned to a supported version.

## Test site

There is a test site in the solution to make working with this repository easier.
It is configured to do an unattended install, check `appsettings.json` for the login details.

## Running the tests

Both test suites run on every pull request (`.github/workflows/ci.yml`) and before every release is packed, and a
red run blocks either. Run them locally before opening a pull request.

**Server** (NUnit), from the repository root:

```bash
dotnet test src/TinyMCE.Umbraco.sln
```

The tests live in `src/TinyMCE.Umbraco.Tests`:
- `Unit/` holds plain unit tests.
- `Integration/` holds tests that boot a real Umbraco on a throwaway SQLite database through Umbraco's own
  integration-test harness (`Umbraco.Cms.Tests.Integration`) and call the Management API over HTTP.

Nothing needs to be running, and the test site's database is never touched.

**Editor** (`@web/test-runner`, in a real Chromium), from `src/TinyMCE.Umbraco.Client`:

```bash
npx playwright install chromium   # once per machine
npm test                          # or: npm run test:watch
```

Tests sit next to the code they test, as `src/**/*.test.ts`. They are type-checked by `npm run build`, and are
excluded from the build output and the npm package.

**What the tests can't reach.** Classic mode renders the editor's content in an iframe, a separate module realm,
and inline mode puts it deep inside the backoffice's shadow DOM. Neither exists in a component test. The manual
checks in `src/TinyMCE.Umbraco.Client/CLAUDE.md` remain the defence there, so a change to how the editor renders
still needs a pass in the test site.

**Write the test first.** The project's constitution (Principle II, Testing Standards) expects a new test to be
written and seen failing before the change it covers. A new Management API endpoint needs at least one happy-path
and one error-path integration test.