import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UMB_BLOCK_RTE_PROPERTY_EDITOR_SCHEMA_ALIAS } from '@umbraco-cms/backoffice/rte';
import type { UmbBlockRteValueModel } from '@umbraco-cms/backoffice/block-rte';
import type { UmbBlockClipboardEntryValueModel } from '@umbraco-cms/backoffice/block';
import type { UmbClipboardCopyPropertyValueTranslator } from '@umbraco-cms/backoffice/clipboard';

export class UmbTinyMceBlockRteToBlockClipboardCopyPropertyValueTranslator
	extends UmbControllerBase
	implements UmbClipboardCopyPropertyValueTranslator<UmbBlockRteValueModel>
{
	async translate(propertyValue: UmbBlockRteValueModel): Promise<UmbBlockClipboardEntryValueModel> {
		if (!propertyValue) {
			throw new Error('Property value is missing.');
		}
		const valueClone = structuredClone(propertyValue);
		const contentData = valueClone.contentData;
		const layout = valueClone.layout?.[UMB_BLOCK_RTE_PROPERTY_EDITOR_SCHEMA_ALIAS] ?? undefined;
		const settingsData = valueClone.settingsData;
		layout?.forEach((layoutItem) => {
			// @ts-expect-error removing $type from layout item
			delete layoutItem.$type;
		});
		return {
			contentData: contentData ?? [],
			layout: layout,
			settingsData: settingsData ?? [],
		};
	}
}

export { UmbTinyMceBlockRteToBlockClipboardCopyPropertyValueTranslator as api };
