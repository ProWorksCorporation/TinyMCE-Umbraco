export const manifests: Array<UmbExtensionManifest> = [
	{
		name: 'TinyMCE Umbraco Entry Point',
		alias: 'TinyMCE.Umbraco.EntryPoint',
		type: 'backofficeEntryPoint',
		js: () => import('./entry-point.js'),
	},
	{
		name: 'TinyMCE Umbraco User Entry Point',
		alias: 'TinyMCE.Umbraco.UserEntryPoint',
		type: 'userEntryPoint',
		js: () => import('./user-entry-point.js'),
	},
];
