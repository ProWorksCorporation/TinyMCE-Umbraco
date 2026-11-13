import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';

/**
 * Inserts new markup at the caret.
 *
 * Use this, not `editor.selection.setContent()`. Straight after a block is inserted the caret sits on TinyMCE's
 * *fake caret* beside it - a `<p data-mce-caret data-mce-bogus="all">` that TinyMCE strips when it serialises.
 * `selection.setContent()` writes into that element as if it were content, so whatever was inserted (a second
 * block, an image) showed in the editor and was then silently left out of the saved value. `insertContent()` turns
 * the fake caret into a real paragraph first.
 * @param {Editor} editor The editor to insert into.
 * @param {string} html The markup to insert.
 */
export function insertAtCaret(editor: Editor, html: string): void {
	editor.insertContent(html);
}
