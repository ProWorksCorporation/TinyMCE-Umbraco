import { manifests as tinyMceManifest } from './tiny-mce/manifests.js';

export const manifests: Array<UmbExtensionManifest> = [
	...tinyMceManifest,
	{
		type: 'propertyEditorUi',
		alias: 'TinyMCE.PropertyEditorUI.TinyMCE.PluginConfiguration',
		name: 'TinyMCE Plugin Property Editor UI',
		element: () => import('./plugin/property-editor-ui-tiny-mce-plugin-configuration.element.js'),
		meta: {
			label: 'TinyMCE Plugin Configuration',
			icon: 'icon-autofill',
			group: 'common',
		},
	},
	{
		type: 'propertyEditorUi',
		alias: 'Umb.PropertyEditorUI.TinyMCE.ToolbarConfiguration',
		name: 'TinyMCE Toolbar Property Editor UI',
		element: () => import('./toolbar/property-editor-ui-tiny-mce-toolbar-configuration.element.js'),
		meta: {
			label: 'TinyMCE Toolbar Configuration',
			icon: 'icon-autofill',
			group: 'common',
		},
	},
	{
		type: 'propertyEditorUi',
		alias: 'Umb.PropertyEditorUI.TinyMCE.CustomConfig',
		name: 'TinyMCE Custom Config Property Editor UI',
		element: () => import('./configEditor/property-editor-ui-tiny-mce-config-editor.element.js'),
		meta: {
			label: 'TinyMCE Custom Configuration',
			icon: 'icon-autofill',
			group: 'common',
		},
	},
];
