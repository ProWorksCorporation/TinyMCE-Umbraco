// The second way an extension registers a custom block view: from a bundle, with `element` as a function that imports
// the element module, which is what a Vite-built package's manifests.ts produces. The function was created in the
// backoffice's own realm, so it imports the module there, not in TinyMCE's iframe.
export const manifests = [
	{
		type: 'blockEditorCustomView',
		alias: 'TinyMCE.Umbraco.TestSite.BlockCustomView.HBlock',
		name: 'TinyMCE TestSite custom block view (bundle, hBlock)',
		element: () => import('./test-block-custom-view.element.js'),
		forContentTypeAlias: 'hBlock',
		forBlockEditor: 'block-rte',
	},
];
