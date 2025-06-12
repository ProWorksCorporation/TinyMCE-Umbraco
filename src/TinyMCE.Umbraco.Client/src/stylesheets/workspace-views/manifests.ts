import { UMB_STYLESHEET_WORKSPACE_ALIAS } from '@umbraco-cms/backoffice/stylesheet';
import { UMB_WORKSPACE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/workspace';

export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'workspaceView',
		alias: 'Umb.WorkspaceView.Stylesheet.RichTextEditor',
		name: 'Stylesheet Workspace Rich Text Editor View',
		element: () => import('./stylesheet-rich-text-rule-workspace-view.element.js'),
		weight: 800,
		meta: {
			label: '#stylesheet_tabRules',
			pathname: 'rich-text-editor',
			icon: 'icon-font',
		},
		conditions: [
			{
				alias: UMB_WORKSPACE_CONDITION_ALIAS,
				match: UMB_STYLESHEET_WORKSPACE_ALIAS,
			},
		],
	},
];
