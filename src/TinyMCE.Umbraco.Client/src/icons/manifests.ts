export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'icons',
		alias: 'Umb.TinyMCE.Icons',
		name: 'TinyMCE Icons',
		js: () => import('./icons.js'),
	},
];
