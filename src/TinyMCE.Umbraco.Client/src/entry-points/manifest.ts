export const manifests: Array<UmbExtensionManifest> = [
	{
		name: 'TinyMCE Umbraco Entry Point',
		alias: 'TinyMCE.Umbraco.EntryPoint',
		type: 'backofficeEntryPoint',
		js: () => import('./entry-point.js'),
	},
];
