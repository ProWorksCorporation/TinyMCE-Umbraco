import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UMB_BLOCK_RTE_PROPERTY_EDITOR_SCHEMA_ALIAS } from '@umbraco-cms/backoffice/rte';
import type { UmbBlockClipboardEntryValueModel } from '@umbraco-cms/backoffice/block';
import type { UmbPropertyEditorRteValueType } from '@umbraco-cms/backoffice/rte';
import type { UmbClipboardPastePropertyValueTranslator } from '@umbraco-cms/backoffice/clipboard';

export class UmbTinyMceBlockToBlockRteClipboardPastePropertyValueTranslator
	extends UmbControllerBase
	implements UmbClipboardPastePropertyValueTranslator<UmbBlockClipboardEntryValueModel, UmbPropertyEditorRteValueType>
{
	async translate(value: UmbBlockClipboardEntryValueModel): Promise<UmbPropertyEditorRteValueType> {
		if (!value) {
			throw new Error('Value is missing.');
		}
		const valueClone = structuredClone(value);
		return {
			markup: '',
			blocks: {
				contentData: valueClone.contentData,
				settingsData: valueClone.settingsData,
				expose: [],
				layout: {
					[UMB_BLOCK_RTE_PROPERTY_EDITOR_SCHEMA_ALIAS]: valueClone.layout ?? undefined,
				},
			},
		};
	}

	async isCompatibleValue(
		propertyValue: UmbPropertyEditorRteValueType,
		config: Array<{ alias: string; value: [{ contentElementTypeKey: string }] }>,
	): Promise<boolean> {
		const allowedBlockContentTypes =
			config.find((c) => c.alias === 'blocks')?.value.map((b) => b.contentElementTypeKey) ?? [];
		const blockContentTypes = propertyValue.blocks?.contentData.map((c) => c.contentTypeKey) ?? [];
		return blockContentTypes.every((b) => allowedBlockContentTypes.includes(b));
	}
}

export { UmbTinyMceBlockToBlockRteClipboardPastePropertyValueTranslator as api };
