# Releasing

How a release of TinyMCE for Umbraco is made. Both packages share one version number: the NuGet package
`TinyMCE.Umbraco` and the npm package `@tiny-mce-umbraco/backoffice`.

**Both are published by hand.** `.github/workflows/release.yml` triggers only on a bare version tag (`17.8.0`), but
releases are tagged `release-17.8.0`, so it has never run. Don't push a bare version tag: if the `NUGET_API_KEY`
secret is set, the workflow would push to NuGet.

## 1. Prepare

1. **Set the version** in all three places:
   - `src/TinyMCE.Umbraco/TinyMCE.Umbraco.csproj` (`<Version>`)
   - `src/TinyMCE.Umbraco.Client/package.json` (`"version"`), then run `npm install --package-lock-only` in that folder
     so `package-lock.json` follows
   - `src/TinyMCE.Umbraco.Client/public/umbraco-package.json` (`"version"`), which the backoffice shows
2. **Update `CHANGELOG.md`.** Rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.
3. **If the minimum Umbraco version changed**, update it everywhere it's stated: the csproj `<Description>` and
   `Umbraco.Cms.*` references, `docs/README_nuget.md`, `.github/README.md`, `.github/CONTRIBUTING.md` and the
   `CLAUDE.md` files. The npm peer dependency on `@umbraco-cms/backoffice` is in `package.json`.
4. **Draft the release notes** from the changelog entry: what's new, what's fixed, anything that needs action before
   upgrading, and known issues.
5. **Merge** through pull requests: the feature branch into `v17/dev`, then `v17/dev` into `v17/main`. CI
   (`build-and-test`) must pass on each.

## 2. Build and check

From the merged `v17/main` commit, with a clean working tree.

```bash
cd src/TinyMCE.Umbraco.Client
npm ci
npm run build                    # the editor's assets; wwwroot is not in git, so pack depends on this
npx playwright install chromium  # once per machine
npm test
cd ../..
dotnet test src/TinyMCE.Umbraco.sln -c Release
dotnet pack src/TinyMCE.Umbraco/TinyMCE.Umbraco.csproj -c Release -o artifacts
```

Check the `.nupkg` (it's a zip):
- the version, and `Umbraco.Cms.*` dependencies at the intended minimum
- `staticwebassets/App_Plugins/TinyMCE.Umbraco/` is populated (several hundred files). If it is empty, `npm run build`
  did not run first and the package would install with no editor
- no keys: no `sk-` values and no Tiny Cloud key anywhere in it

Then the npm package, in `src/TinyMCE.Umbraco.Client`:

```bash
npm run build:api   # always a clean, full build into dist-cms
npm pack
```

`npm pack` prints the file count. Compare it with the previous release
(`npm view @tiny-mce-umbraco/backoffice@<previous> dist.fileCount`): it should be similar, and the tarball must contain
`dist-cms/index.js` and `dist-cms/external/tinymce/index.js`.

## 3. Publish

1. **NuGet:** `dotnet nuget push artifacts/TinyMCE.Umbraco.X.Y.Z.nupkg -k <api key> -s https://api.nuget.org/v3/index.json`
2. **npm:** in `src/TinyMCE.Umbraco.Client`, `npm publish`. It needs an npm login with publish rights on the
   `@tiny-mce-umbraco` scope; the package is public (`publishConfig`).
3. **GitHub release:** tag `release-X.Y.Z` on the `v17/main` merge commit, title `X.Y.Z`, and the release notes as
   the body.

The Umbraco Marketplace listing follows the NuGet package (tagged `umbraco-marketplace`). The listing's metadata is in
`umbraco-marketplace-tinymce.umbraco.json` and its readme; they only need changing when the description, screenshots
or supported versions change.

## 4. After publishing

- **Smoke test the published package** on a fresh site: create one from the Umbraco template at the newest supported
  patch, add the package from NuGet, create a TinyMCE Data Type and a document that uses it, then edit, save and reload,
  watching the browser console. Confirm the install changed no `Umbraco.Cms.*` version.
- **Point the example at the release:** `examples/tinymce-mentions-plugin/package.json` pins
  `@tiny-mce-umbraco/backoffice` and `@umbraco-cms/backoffice`. Move them to the new versions and run
  `npm run typecheck` there.
- **Reopen the changelog:** add an empty `## [Unreleased]` above the release entry.
