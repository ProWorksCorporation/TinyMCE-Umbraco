// The `TinyMCE.Lib` bundle used to import the packaged TinyMCE core here as a side effect. It no
// longer does: the core is resolved on demand by `loadTinyMce()` in `external/tinymce/index.ts`, which
// leaves `window.tinymce` alone when a site has supplied its own core. See the comment there, and
// issue #225 - loading eagerly from a bundle raced any on-premises/CDN bundle and clobbered it,
// because `overwrites` is ignored for `type: "bundle"` extensions.
//
// The bundle itself is still registered in `umbraco-package.json` so that existing
// `overwrites: "TinyMCE.Lib"` declarations stay valid (they remain no-ops, but harmless ones).

export const manifests: Array<UmbExtensionManifest> = [
];
