/**
 * TinyMCE's inline mode assumes its editable element is somewhere document-level APIs can reach. In the
 * backoffice it sits some twenty shadow roots deep (`umb-input-tiny-mce` -> ... -> `umb-app`), so three
 * of those APIs silently fail and are bridged here. Classic mode needs none of it: its editable body is
 * a plain document body inside the editor's own iframe.
 *
 * Every failure mode below is silent - no exception, no stack trace. See **Inline Mode and Shadow DOM**
 * in this project's CLAUDE.md for the symptoms and how to test them.
 */

import type { Editor } from '@tiny-mce-umbraco/backoffice/external/tinymce';

type SelectionRoot = ShadowRoot & { getSelection?: () => Selection | null };

/** Editable elements of the live inline editors; read by both document-level bridges. */
const inlineBodies = new Set<HTMLElement>();

let installed = false;

/**
 * Resolved per call, never cached from focus/blur events: TinyMCE moves the selection while its own
 * focus bookkeeping is mid-flight, and a stale flag there sends `setRng` to the wrong selection. This is
 * the same liveness check TinyMCE's own `hasInlineFocus` makes.
 */
function getFocusedInlineBody(): HTMLElement | null {
	for (const body of inlineBodies) {
		if ((body.getRootNode() as SelectionRoot).activeElement === body) return body;
	}

	return null;
}

/**
 * TinyMCE reads the caret through `win.getSelection()` (`getSel` in `Selection.getRng`), which never
 * descends into a shadow root. `ShadowRoot.getSelection()` does.
 *
 * Diverts only while one of our inline editors holds focus, so every other caller gets the native
 * selection untouched.
 */
function installShadowDomSelectionBridge() {
	const nativeGetSelection = window.getSelection.bind(window);

	window.getSelection = function (): Selection | null {
		const body = getFocusedInlineBody();
		if (!body) return nativeGetSelection();

		// Chromium-only API, so fall back rather than break the selection where it is missing.
		const selection = (body.getRootNode() as SelectionRoot).getSelection?.();

		return selection ?? nativeGetSelection();
	};
}

/**
 * `Selection.setRng` guards with `isValidRange` -> `isAttachedToDom` -> Sugar's `contains`, a plain
 * `d1.contains(d2)` that does not cross shadow boundaries. Every range inside the editor is therefore
 * judged detached, and `setRng` returns before it dispatches anything.
 *
 * Patched on the document object rather than `Node.prototype` because that is the exact call being
 * made. Only ever turns `false` into `true`, and only for nodes inside a live inline editor.
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

/** Installs the document-level bridges, once per page. */
function installBridges() {
	if (installed) return;
	installed = true;

	installShadowDomSelectionBridge();
	installShadowDomAttachmentBridge();
}

/**
 * `DOMUtils.get(id)` is `doc.getElementById(id)`, which cannot see into a shadow root. TinyMCE's
 * bookmarks depend on it: operations that restructure the DOM drop `<span data-mce-type="bookmark">`
 * markers and call `moveToBookmark` to restore the caret afterwards. Unresolvable markers mean the caret
 * is never restored *and* the markers are never removed - they accumulate in the content and get saved.
 *
 * Searching the editor body first also scopes ids per editor rather than first-match-in-document.
 * @param editor The inline editor to patch.
 */
function bridgeEditorLookups(editor: Editor) {
	const dom = editor.dom;
	const nativeGet = dom.get.bind(dom);

	dom.get = (elm: string | HTMLElement) => {
		if (typeof elm !== 'string') return nativeGet(elm);

		const body = editor.getBody();
		if (!body) return nativeGet(elm);

		// Inline mode's body is the target element itself, so it can be the id being asked for.
		if (body.id === elm) return body;

		return body.querySelector<HTMLElement>(`#${CSS.escape(elm)}`) ?? nativeGet(elm);
	};
}

/**
 * Applies the shadow-DOM bridges to a freshly initialized inline editor. Call for inline editors only.
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
