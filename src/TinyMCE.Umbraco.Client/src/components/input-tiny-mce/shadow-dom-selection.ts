/**
 * Bridges the three places where TinyMCE's inline mode assumes a document it can see into, but the
 * backoffice gives it a shadow root instead: the caret (`window.getSelection`), the check that a
 * range is still on the page (`document.contains`), and id lookups (`DOMUtils.get`).
 *
 * In classic mode the editor's realm is its own iframe, whose editable body is a plain document
 * body - document-level APIs find it, and none of this is needed. Inline mode has no iframe: the
 * editable element is the target element itself, which in the backoffice sits more than twenty
 * shadow roots deep (`umb-input-tiny-mce` -> ... -> `umb-app`). Moving the target into the light
 * DOM does not help, because that only escapes one shadow root out of the chain.
 */

import type { Editor } from '@tiny-mce-umbraco/backoffice/external/tinymce';

type SelectionRoot = ShadowRoot & { getSelection?: () => Selection | null };

/**
 * The editable elements of the live inline editors, so the selection bridge can tell which of them
 * (if any) currently holds focus.
 */
const inlineBodies = new Set<HTMLElement>();

let installed = false;

/**
 * The editable element of the inline editor that currently has focus, if any.
 *
 * Deliberately resolved on each call rather than tracked through focus/blur events: TinyMCE moves
 * the selection at moments when its own focus bookkeeping is mid-flight, and a stale flag there
 * means `setRng` silently writes to the wrong selection - which looks like the caret refusing to
 * move. `root.activeElement === body` is the same liveness check TinyMCE's own `hasInlineFocus`
 * makes, and it cannot go stale.
 */
function getFocusedInlineBody(): HTMLElement | null {
	for (const body of inlineBodies) {
		if ((body.getRootNode() as SelectionRoot).activeElement === body) return body;
	}

	return null;
}

/**
 * Makes `window.getSelection()` shadow-aware while an inline editor has focus.
 *
 * TinyMCE resolves the caret through `win.getSelection()` (see `getSel` in `Selection.getRng`),
 * and a window selection never descends into a shadow root - so every call returns a range
 * anchored at the host document's `<body>` instead of inside the editor. Reads then normalize each
 * keystroke against a range outside the editor and the input is dropped; writes (`setRng`) land on
 * a selection that cannot address the editor's nodes at all, so the caret never moves.
 *
 * `ShadowRoot.getSelection()` does report the real range, so this bridges the two. It is installed
 * once and only diverts while one of our inline editors actually holds focus - every other caller,
 * at every other moment, gets the untouched native selection.
 */
function installShadowDomSelectionBridge() {
	const nativeGetSelection = window.getSelection.bind(window);

	window.getSelection = function (): Selection | null {
		const body = getFocusedInlineBody();
		if (!body) return nativeGetSelection();

		// `ShadowRoot.getSelection()` is a Chromium extension rather than a standard API. Where it is
		// missing there is nothing to bridge with, so fall back rather than break the selection.
		const selection = (body.getRootNode() as SelectionRoot).getSelection?.();

		return selection ?? nativeGetSelection();
	};
}

/** Installs the document-level bridges, once per page. */
function installBridges() {
	if (installed) return;
	installed = true;

	installShadowDomSelectionBridge();
	installShadowDomAttachmentBridge();
}

/**
 * Scopes an editor's id lookups to its own body, so they can see inside the shadow root.
 *
 * `DOMUtils.get(id)` is `doc.getElementById(id)`, and for an inline editor `doc` is the host
 * document - which cannot see an element inside a shadow root. That breaks TinyMCE's bookmarks:
 * operations that restructure the DOM (pressing Enter, applying a block format, most commands)
 * drop `<span data-mce-type="bookmark" id="..._start">` markers, rebuild the content, then call
 * `moveToBookmark` to put the caret back. `restoreEndPoint` resolves those markers with `dom.get`,
 * so in a shadow root it finds nothing: the caret is left where it was, and the markers are never
 * removed, so they pile up in the content - one pair per edit.
 *
 * Looking the id up inside the editor body first fixes both, and also keeps ids scoped per editor
 * rather than first-match-in-the-document. Anything not found there falls back to the native
 * lookup, which is what `dom.get` is for when the id is outside the editor.
 * @param editor The inline editor to patch.
 */
function bridgeEditorLookups(editor: Editor) {
	const dom = editor.dom;
	const nativeGet = dom.get.bind(dom);

	dom.get = (elm: string | HTMLElement) => {
		if (typeof elm !== 'string') return nativeGet(elm);

		const body = editor.getBody();
		if (!body) return nativeGet(elm);

		// In inline mode the body is the target element itself, so it can be the id being asked for.
		if (body.id === elm) return body;

		return body.querySelector<HTMLElement>(`#${CSS.escape(elm)}`) ?? nativeGet(elm);
	};
}

/**
 * Teaches `document.contains()` that the inline editors' content is on the page.
 *
 * TinyMCE guards `Selection.setRng` with `isValidRange` -> `isAttachedToDom`, which asks
 * `contains(node.ownerDocument, node)` - and Sugar's `contains` is a plain `d1.contains(d2)`, which
 * does not cross shadow boundaries. So every range inside the editor is judged detached and
 * `setRng` returns on its first line, without even dispatching `SetSelectionRange`. The visible
 * effect is that nothing which repositions the caret works: pressing Enter builds the new paragraph
 * but leaves the caret on the old line, and the same goes for the commands that move the caret
 * after restructuring content.
 *
 * Overriding `contains` on the document object (not on `Node.prototype`) is enough, because that is
 * exactly the call `isAttachedToDom` makes. It only ever turns `false` into `true`, only for nodes
 * inside a live inline editor - which are genuinely attached to the page, just behind a shadow
 * boundary that the DOM method predates.
 */
function installShadowDomAttachmentBridge() {
	const nativeContains = document.contains.bind(document);

	document.contains = (node: Node | null) => {
		if (nativeContains(node)) return true;
		if (!node) return false;

		for (const body of inlineBodies) {
			if (body === node || body.contains(node)) return true;
		}

		return false;
	};
}

/**
 * Applies the shadow-DOM bridges to a freshly initialized inline editor, and tears them down again
 * when it is removed. Safe to call for inline editors only - classic editors need none of this.
 * @param editor The inline editor to bridge.
 */
export function bridgeInlineEditor(editor: Editor) {
	const body = editor.getBody();
	if (!body) return;

	bridgeEditorLookups(editor);

	inlineBodies.add(body);
	installBridges();

	editor.on('remove', () => inlineBodies.delete(body));
}
