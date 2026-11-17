/**
 * Stops Escape in TinyMCE's own UI (its dialogs, and the menus in its UI sink) from also closing the native `<dialog>`
 * around the editor: a block's side panel, or any other Umbraco modal.
 *
 * Chromium turns an Escape keydown that nobody cancelled into a close request for the topmost modal `<dialog>`, which
 * fires `cancel` on it, and Umbraco's `uui-modal-*` elements close on `cancel`. TinyMCE closes its dialogs on Escape
 * **keyup** (the `exit` rule in its keying's `getKeyupRules`), so it never cancels the keydown and the panel closed
 * along with the dialog, asking to discard changes if the block had been edited. Cancelling the keydown is what
 * Umbraco's own `umb-persistent-modal-dialog` does to keep Escape from closing it. TinyMCE still closes its dialog on
 * keyup, and Escape anywhere else, including in the editable content, still closes the panel.
 *
 * Listen on the `umb-input-tiny-mce` host: TinyMCE's sink (`.tox-tinymce-aux`) is inside its shadow root in both modes.
 *
 * @param {KeyboardEvent} event The keydown event.
 */
export function preventEscapeCloseRequest(event: KeyboardEvent): void {
	if (event.key !== 'Escape' || event.defaultPrevented) return;
	const inTinyMceUi = event
		.composedPath()
		.some((node) => node instanceof Element && node.classList.contains('tox-tinymce-aux'));
	if (inTinyMceUi) event.preventDefault();
}
