/**
 * Workaround: let blob:/data: downloads through Umbraco's router.
 *
 * ## The problem
 *
 * Umbraco's router (`router-slot`) installs a global click listener that converts any same-origin
 * anchor click into a history navigation — see
 * `packages/core/router/router-slot/util/anchor.ts` (`ensureAnchorHistory`):
 *
 * ```js
 * fullUrl = new URL(href, document.baseURI);
 * if (fullUrl.origin !== location.origin || ...) return;
 * e.preventDefault();
 * history.pushState(null, '', fullUrl);
 * ```
 *
 * Blob URLs inherit the origin of the document that created them, so
 * `new URL('blob:https://site:44308/<uuid>').origin` is `https://site:44308` — the origin guard
 * passes and the anchor is treated as an internal navigation. The router then:
 *
 * 1. calls `e.preventDefault()`, which **cancels the download**, and
 * 2. calls `history.pushState` with a `blob:` URL, which is invalid and throws
 *    `SecurityError: A history state object with URL 'blob:…' cannot be created in a document
 *    with origin '…'`.
 *
 * The net effect is that any download served from a `blob:` or `data:` URL inside the backoffice
 * silently fails. TinyMCE's `export` plugin (PDF export via `clientpdf`) hits this on every
 * download attempt.
 *
 * ## The fix
 *
 * The router deliberately skips anchors carrying `data-router-slot="disabled"`. We cannot set that
 * at creation time because the anchor is created inside TinyMCE's minified plugin bundle, so we tag
 * it in flight instead: this listener is registered in the **capture** phase on `window`, which runs
 * before the router's own bubble-phase listener on that same target. By the time the router sees the
 * event, the anchor is marked and the router leaves it alone.
 *
 * Only `blob:` and `data:` are tagged. Ordinary links are untouched, so in-app navigation is
 * unaffected.
 *
 * ## Upstream
 *
 * This is arguably an Umbraco defect: the router should not attempt to route non-`http(s)` schemes
 * at all, which would also cover `mailto:` and `tel:`. It affects any blob-based download in the
 * backoffice, not only TinyMCE. Verified present in Umbraco 17.6.2, and `anchor.ts` is byte-identical
 * back to at least 17.5.0 — so this is long-standing, not a regression. Remove this workaround once
 * the router gains a scheme guard.
 */

/** Schemes that must never be handed to `history.pushState`. */
const NON_ROUTABLE_SCHEME = /^(?:blob|data):/i;

let isListening = false;

const onClickCapture = (event: Event): void => {
	// composedPath() is required to see through shadow boundaries — the same approach the
	// router itself uses.
	const anchor = event
		.composedPath()
		.find((target): target is HTMLAnchorElement => target instanceof HTMLAnchorElement);

	if (!anchor || !NON_ROUTABLE_SCHEME.test(anchor.href)) return;

	// Opt this anchor out of router-slot handling. The router reads
	// `$anchor.dataset['routerSlot'] === 'disabled'` and returns early.
	anchor.dataset['routerSlot'] = 'disabled';
};

/**
 * Starts tagging `blob:`/`data:` anchors so Umbraco's router does not cancel the download.
 * Safe to call more than once; only the first call registers a listener.
 */
export function enableBlobDownloadWorkaround(): void {
	if (isListening) return;
	// Capture phase, so this runs before router-slot's bubble-phase listener on `window`.
	window.addEventListener('click', onClickCapture, true);
	isListening = true;
}

/** Removes the listener registered by {@link enableBlobDownloadWorkaround}. */
export function disableBlobDownloadWorkaround(): void {
	if (!isListening) return;
	window.removeEventListener('click', onClickCapture, true);
	isListening = false;
}
