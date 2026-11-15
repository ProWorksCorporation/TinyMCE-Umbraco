const copies = new WeakMap<CSSStyleSheet, WeakMap<Document, CSSStyleSheet>>();

/**
 * A copy of `sheet` constructed in `doc`, made once per sheet and document.
 *
 * @param {CSSStyleSheet} sheet The stylesheet to copy.
 * @param {Document} doc The document the copy is for.
 * @returns {CSSStyleSheet} The copy.
 */
function copyFor(sheet: CSSStyleSheet, doc: Document): CSSStyleSheet {
	let perDocument = copies.get(sheet);
	if (!perDocument) copies.set(sheet, (perDocument = new WeakMap()));
	let copy = perDocument.get(doc);
	if (!copy) {
		const SheetInDocument = (doc.defaultView as (Window & typeof globalThis) | null)?.CSSStyleSheet ?? CSSStyleSheet;
		copy = new SheetInDocument({ media: sheet.media.mediaText });
		copy.replaceSync([...sheet.cssRules].map((rule) => rule.cssText).join('\n'));
		perDocument.set(doc, copy);
	}
	return copy;
}

let installed = false;

/**
 * Lets a shadow root adopt constructed stylesheets from another document, by adopting copies made in its own document.
 *
 * The browser refuses `adoptedStyleSheets` from another document ("Sharing constructed stylesheets in multiple
 * documents is not allowed"). That is what happens to an element created in the backoffice's realm and placed in the
 * classic editor's iframe, such as a custom block view registered from a bundle: its `element: () => import(...)` was
 * created in the backoffice's realm, so it loads the element there, and Lit then hands the iframe's shadow root the
 * backoffice's stylesheets. The render threw before drawing anything, so the block showed an empty custom view (#206).
 *
 * Only an assignment that throws `NotAllowedError` is retried, with copies; every other assignment runs unchanged.
 * Copies are made once per stylesheet and document. Installed once, for the backoffice's realm.
 */
export function allowStyleSheetsAcrossDocuments(): void {
	if (installed) return;
	const descriptor = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'adoptedStyleSheets');
	const set = descriptor?.set;
	if (!descriptor || !set) return;
	installed = true;

	Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
		...descriptor,
		set(this: ShadowRoot, sheets: CSSStyleSheet[]) {
			try {
				set.call(this, sheets);
			} catch (error) {
				if ((error as DOMException)?.name !== 'NotAllowedError') throw error;
				const doc = this.ownerDocument;
				set.call(
					this,
					[...sheets].map((sheet) => copyFor(sheet, doc)),
				);
			}
		},
	});
}
