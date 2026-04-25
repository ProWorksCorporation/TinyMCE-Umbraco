import { UMB_BLOCK_RTE_PROPERTY_EDITOR_UI_ALIAS } from '@tiny-mce-umbraco/backoffice/core';
import { UMB_BLOCK_CLIPBOARD_ENTRY_VALUE_TYPE } from '@umbraco-cms/backoffice/block';

export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'clipboardCopyPropertyValueTranslator',
		alias: 'TinyMCE.ClipboardCopyPropertyValueTranslator.BlockRteToBlock',
		name: 'TinyMCE Block RTE To Block Clipboard Copy Property Value Translator',
		api: () => import('./block/copy/block-rte-to-block-copy-translator.js'),
		fromPropertyEditorUi: UMB_BLOCK_RTE_PROPERTY_EDITOR_UI_ALIAS,
		toClipboardEntryValueType: UMB_BLOCK_CLIPBOARD_ENTRY_VALUE_TYPE,
	},
	{
		type: 'clipboardPastePropertyValueTranslator',
		alias: 'TinyMCE.ClipboardPastePropertyValueTranslator.BlockToBlockRte',
		name: 'TinyMCE Block To Block RTE Clipboard Paste Property Value Translator',
		api: () => import('./block/paste/block-to-block-rte-paste-translator.js'),
		fromClipboardEntryValueType: UMB_BLOCK_CLIPBOARD_ENTRY_VALUE_TYPE,
		toPropertyEditorUi: UMB_BLOCK_RTE_PROPERTY_EDITOR_UI_ALIAS,
	},
];
