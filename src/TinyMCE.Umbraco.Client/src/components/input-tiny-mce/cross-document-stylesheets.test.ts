// An element created in the backoffice's realm and placed in the classic editor's iframe can't use the backoffice's
// constructed stylesheets: the browser refuses `adoptedStyleSheets` from another document. A custom block view registered
// from a bundle (`element: () => import(...)`) is exactly that, and Lit's render threw before drawing anything (#206).
import { expect } from '@open-wc/testing';
import { css, html, LitElement } from '@umbraco-cms/backoffice/external/lit';
import { allowStyleSheetsAcrossDocuments } from './cross-document-stylesheets.js';

class CrossDocumentTestElement extends LitElement {
	static override styles = css`
		p {
			color: rgb(255, 0, 0);
		}
	`;
	override render() {
		return html`<p>styled</p>`;
	}
}
customElements.define('cross-document-test-element', CrossDocumentTestElement);

describe('allowStyleSheetsAcrossDocuments', () => {
	let iframe: HTMLIFrameElement;
	let iframeDoc: Document;

	before(() => allowStyleSheetsAcrossDocuments());

	beforeEach(async () => {
		iframe = document.createElement('iframe');
		document.body.append(iframe);
		iframeDoc = iframe.contentDocument!;
	});

	afterEach(() => iframe.remove());

	it("lets a shadow root in the iframe adopt this document's stylesheets, as copies", () => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync('p { color: rgb(0, 0, 255); }');
		const host = document.createElement('div');
		iframeDoc.body.append(host);
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = '<p>text</p>';

		root.adoptedStyleSheets = [sheet];

		expect(root.adoptedStyleSheets.length).to.equal(1);
		expect(root.adoptedStyleSheets[0], 'a copy, not the original').to.not.equal(sheet);
		const p = root.querySelector('p')!;
		expect(iframe.contentWindow!.getComputedStyle(p).color).to.equal('rgb(0, 0, 255)');
	});

	it('renders a Lit element from this realm, with its styles, inside the iframe', async () => {
		const element = document.createElement('cross-document-test-element') as CrossDocumentTestElement;
		iframeDoc.body.append(element);
		await element.updateComplete;

		const p = element.shadowRoot?.querySelector('p');
		expect(!!p, 'rendered').to.equal(true);
		expect(iframe.contentWindow!.getComputedStyle(p!).color).to.equal('rgb(255, 0, 0)');
	});

	it('reuses one copy per stylesheet and document', () => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync('p { color: rgb(0, 128, 0); }');
		const roots = [0, 1].map(() => {
			const host = document.createElement('div');
			iframeDoc.body.append(host);
			const root = host.attachShadow({ mode: 'open' });
			root.adoptedStyleSheets = [sheet];
			return root;
		});

		expect(roots[0].adoptedStyleSheets[0]).to.equal(roots[1].adoptedStyleSheets[0]);
	});

	it('still throws errors other than the cross-document one', () => {
		const host = document.createElement('div');
		iframeDoc.body.append(host);
		const root = host.attachShadow({ mode: 'open' });

		expect(() => {
			root.adoptedStyleSheets = ['not a stylesheet' as unknown as CSSStyleSheet];
		}).to.throw(TypeError);
	});

	it('leaves same-document assignments alone', () => {
		const sheet = new CSSStyleSheet();
		const host = document.createElement('div');
		document.body.append(host);
		const root = host.attachShadow({ mode: 'open' });

		root.adoptedStyleSheets = [sheet];

		expect(root.adoptedStyleSheets[0]).to.equal(sheet);
		host.remove();
	});
});
