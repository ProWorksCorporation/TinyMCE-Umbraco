// The icon sets ship as plain side-effect JS with no typings. Previously reached via a bare
// `import 'tinymce/icons/default/icons.js'`, which TypeScript does not type-check; it is now a dynamic
// import (see `loadTinyMce`), which it does.
declare module 'tinymce/icons/default/icons.js';
