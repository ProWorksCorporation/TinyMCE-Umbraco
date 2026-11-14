import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import { UmbId } from '@umbraco-cms/backoffice/id';

const PREFIX = '__mcenew';

/**
 * A temporary id for an image about to be inserted, so the media picker can find it again to size it.
 *
 * Unique per insert. It used to be the fixed id `__mcenew`, and content saved before the inline-mode fixes in 17.6.2
 * can still carry it (inline mode could not find the image again, so never removed the id). With a fixed id the
 * lookup returned that old image instead of the new one: the old image was resized to the new one's proportions,
 * and the new one kept the id, so the same happened on the next insert.
 * @returns {string} An id no other element in the editor has.
 */
export function newImageMarkerId(): string {
	return `${PREFIX}-${UmbId.new()}`;
}

/**
 * Keeps marker ids, old and new, out of the saved value, which also removes the old fixed id from existing content
 * the next time it is saved. Can be called before TinyMCE has created its serializer (a plugin constructor runs
 * during setup).
 * @param {Editor} editor The editor whose output to filter.
 */
export function stripNewImageMarkers(editor: Editor): void {
	const addFilter = () =>
		editor.serializer.addAttributeFilter('id', (nodes) => {
			for (const node of nodes) {
				if (node.attr('id')?.startsWith(PREFIX)) node.attr('id', null);
			}
		});

	if (editor.serializer) addFilter();
	else editor.on('PreInit', addFilter);
}
