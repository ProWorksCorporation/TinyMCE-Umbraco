# Contributing Guidelines

Contributions to this package are most welcome! 

## Prerequisites

- **.NET SDK 10.0 or later** — the projects target `net10.0`.
- **Node.js 24.13+ and npm 11+** — required by `@umbraco-cms/backoffice` 17.6.2, which the frontend
  builds against. On an older Node, npm emits only an `EBADENGINE` *warning* rather than failing, so
  the install appears to succeed and the build breaks later in confusing ways. Check with
  `node --version` and `npm --version` before reporting a build problem.
- **Umbraco 17.6.2 or later** if you are testing against your own site. The bundled test site is
  already pinned to a supported version.

## Test site

There is a test site in the solution to make working with this repository easier.
It is configured to do an unattended install, check `appsettings.json` for the login details.