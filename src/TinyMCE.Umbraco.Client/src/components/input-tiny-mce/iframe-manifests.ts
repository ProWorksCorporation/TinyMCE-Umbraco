import type { ManifestBase, UmbExtensionRegistry } from '@umbraco-cms/backoffice/extension-api';

/** The block editor alias Umbraco's rich text block components use (`UMB_BLOCK_RTE` in `block-rte`). */
const BLOCK_RTE = 'block-rte';

type BlockEditorManifest = ManifestBase & {
	conditions?: Array<{ alias: string }>;
	forBlockEditor?: string | string[];
};

const isForRichText = (manifest: BlockEditorManifest) =>
	!manifest.forBlockEditor || [manifest.forBlockEditor].flat().includes(BLOCK_RTE);

/**
 * The extension manifests the classic-mode iframe needs a copy of.
 *
 * The iframe is a separate realm with its own `umbExtensionsRegistry`, which the block components inside it read as a
 * module-level import, not through a context. Manifests that site packages register (from `umbraco-package.json` or a
 * bundle) exist only in the backoffice's registry, so the ones the block components look up have to be copied in:
 *
 * - `blockAction`, for the action bar (`umb-block-action-list`);
 * - `blockEditorCustomView` for rich text blocks, for the block itself: `umb-rte-block` renders an extension slot of
 *   that type and falls back to its standard look when the slot finds nothing, so without them a block never showed its
 *   custom view in classic mode (#206); and
 * - the `condition` manifests either of them names. Conditions are resolved by alias in the registry the extension is
 *   registered in, and an extension whose condition is missing stays un-initialized, with no error.
 *
 * Called in the backoffice's realm when an editor starts; the iframe registers the result.
 *
 * @param {UmbExtensionRegistry<ManifestBase>} registry The backoffice's extension registry.
 * @returns {ManifestBase[]} The manifests to copy.
 */
export function iframeManifests(registry: UmbExtensionRegistry<ManifestBase>): ManifestBase[] {
	const blockActions = registry.getByType('blockAction') as BlockEditorManifest[];
	const customViews = (registry.getByType('blockEditorCustomView') as BlockEditorManifest[]).filter(isForRichText);
	const extensions = [...blockActions, ...customViews];

	const conditionAliases = new Set(extensions.flatMap((m) => (m.conditions ?? []).map((c) => c.alias)));
	const conditions = registry.getByType('condition').filter((c) => conditionAliases.has(c.alias));

	return [...extensions, ...conditions];
}
