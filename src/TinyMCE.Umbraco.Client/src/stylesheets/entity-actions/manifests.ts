import { UMB_STYLESHEET_FOLDER_ENTITY_TYPE, UMB_STYLESHEET_ROOT_ENTITY_TYPE } from '@umbraco-cms/backoffice/stylesheet';

export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'entityCreateOptionAction',
		alias: 'Umb.EntityCreateOptionAction.Stylesheet.Rte',
		name: 'RTE Stylesheet Entity Create Option Action',
		weight: 90,
		api: () => import('./rte-stylesheet-create-option-action.js'),
		forEntityTypes: [UMB_STYLESHEET_ROOT_ENTITY_TYPE, UMB_STYLESHEET_FOLDER_ENTITY_TYPE],
		meta: {
			icon: 'icon-palette',
			label: '#create_newRteStyleSheetFile',
		},
	},
];
