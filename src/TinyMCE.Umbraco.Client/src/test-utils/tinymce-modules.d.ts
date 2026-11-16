// The theme and model ship as plain side-effect JS with no typings. Production never imports them - TinyMCE loads them
// itself from `base_url` - but a test that boots a real editor has to (see plugins/core/insert-at-caret.test.ts). Kept
// out of src/external so the declarations do not end up in the published typings.
declare module 'tinymce/themes/silver/theme.js';
declare module 'tinymce/models/dom/model.js';
