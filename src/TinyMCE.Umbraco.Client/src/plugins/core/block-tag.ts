import type { UmbBlockRteTypeModel } from '@umbraco-cms/backoffice/block-rte';

/**
 * The element a newly inserted block is written as: `umb-rte-block-inline` when its block type has "Display inline"
 * on, otherwise `umb-rte-block`.
 *
 * Since Umbraco 17.6 "Display inline" is a setting of the block type (`UmbBlockRteTypeModel.displayInline`). The
 * layout entry's `displayInline` is deprecated (to be removed in Umbraco 19) and no longer set when a block is
 * created, so reading it wrote every block as `umb-rte-block` (#224, fixed by PR #239). This is the same lookup
 * Umbraco's own Tiptap block extension uses.
 *
 * @param {readonly UmbBlockRteTypeModel[] | undefined} blockTypes The Data Type's block types.
 * @param {string} contentTypeKey The new block's content element type.
 * @returns {string} The element name. A block type that isn't configured falls back to `umb-rte-block`.
 */
export function blockTagFor(blockTypes: readonly UmbBlockRteTypeModel[] | undefined, contentTypeKey: string): string {
	const blockType = blockTypes?.find((x) => x.contentElementTypeKey === contentTypeKey);
	return blockType?.displayInline ? 'umb-rte-block-inline' : 'umb-rte-block';
}
