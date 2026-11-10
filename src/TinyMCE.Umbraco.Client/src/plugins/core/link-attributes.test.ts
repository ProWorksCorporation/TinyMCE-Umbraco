// How links are written to and read from `<a>` attributes (contracts/link-markup.md, data-model §5).
// The culture row is US4 and is covered with `data-culture`.
import { expect } from '@open-wc/testing';
import { attributesFromLink, isLocalLinkHref, linkFromAttributes } from './link-attributes.js';
import type { UmbTinyMceLinkAttributes } from './link-attributes.js';
import type { UmbLinkPickerLink } from '@umbraco-cms/backoffice/multi-url-picker';

const DOC = '4f1c2a3b-0000-4000-8000-000000000001';
const MEDIA = '9a2e5c6d-0000-4000-8000-000000000002';

/** The attributes that will actually be on the element: `null` means "remove", so it is left out. */
function written(attrs: UmbTinyMceLinkAttributes): Record<string, string> {
	return Object.fromEntries(Object.entries(attrs).filter(([, value]) => value !== null && value !== undefined)) as Record<
		string,
		string
	>;
}

/** The fields of data-model §5, with "absent" normalised to null. */
function fields(link: UmbLinkPickerLink) {
	return {
		type: link.type ?? null,
		unique: link.unique ?? null,
		url: link.url ?? null,
		queryString: link.queryString ?? null,
		name: link.name ?? null,
		target: link.target ?? null,
	};
}

/** Each "Written forms" row of contracts/link-markup.md (except culture), as the link the picker hands back. */
const writtenForms: Array<{ row: string; link: UmbLinkPickerLink; html: Record<string, string> }> = [
	{
		row: 'External',
		link: { type: 'external', unique: null, url: 'https://example.com/page', name: 'Example' },
		html: { href: 'https://example.com/page', title: 'Example' },
	},
	{
		row: 'External, new window',
		link: { type: 'external', unique: null, url: 'https://example.com', name: 'Example', target: '_blank' },
		html: { href: 'https://example.com', title: 'Example', target: '_blank', rel: 'noopener' },
	},
	{
		row: 'Document',
		link: { type: 'document', unique: DOC, url: `/{localLink:${DOC}}`, name: 'About us' },
		html: { href: `/{localLink:${DOC}}`, type: 'document', title: 'About us' },
	},
	{
		row: 'Document + anchor',
		link: { type: 'document', unique: DOC, url: `/{localLink:${DOC}}`, name: 'Team', queryString: '#team' },
		html: { href: `/{localLink:${DOC}}#team`, type: 'document', 'data-anchor': '#team', title: 'Team' },
	},
	{
		row: 'Media',
		link: { type: 'media', unique: MEDIA, url: `/{localLink:${MEDIA}}`, name: 'Brochure' },
		html: { href: `/{localLink:${MEDIA}}`, type: 'media', title: 'Brochure' },
	},
];

describe('attributesFromLink', () => {
	for (const { row, link, html } of writtenForms) {
		it(`writes the "${row}" form`, () => {
			expect(written(attributesFromLink(link))).to.deep.equal(html);
		});
	}

	// C-LNK-1: `editor.dom.setAttribs` removes an attribute given null, so an edited legacy link loses `type="external"`.
	it('sets type to null for an external link, so a legacy type attribute is removed (C-LNK-1)', () => {
		expect(attributesFromLink({ type: 'external', url: 'https://example.com', name: 'x' })).to.have.property('type', null);
	});

	it('sets type to null for a link read from a legacy type="external" anchor (C-LNK-1)', () => {
		const link = linkFromAttributes({ href: 'https://example.com', type: 'external', title: 'x' });
		expect(attributesFromLink(link)).to.have.property('type', null);
	});

	it('does not write a type for a document type without a unique', () => {
		expect(attributesFromLink({ type: 'document', unique: null, url: 'https://example.com' })).to.have.property('type', null);
	});

	// Every managed attribute is present in the result, so editing a link rewrites it wholesale (data-model §5).
	it('names every managed attribute, so stale ones are removed on edit', () => {
		const attrs = attributesFromLink({ type: 'external', url: 'https://example.com' });
		expect(Object.keys(attrs)).to.include.members(['href', 'title', 'target', 'type', 'rel', 'data-anchor']);
		expect(attrs['data-anchor']).to.equal(null);
		expect(attrs.rel).to.equal(null);
		expect(attrs.target).to.equal(null);
	});

	it('falls back to the URL for the title when there is no name', () => {
		expect(attributesFromLink({ type: 'external', url: 'https://example.com' }).title).to.equal('https://example.com');
	});

	it('appends a query string to the href, starting with "/" when there is no URL', () => {
		expect(written(attributesFromLink({ type: 'external', url: '', queryString: '?a=1' }))).to.deep.equal({
			href: '/?a=1',
			title: '',
			'data-anchor': '?a=1',
		});
		expect(attributesFromLink({ type: 'external', url: 'https://example.com', queryString: '?a=1' }).href).to.equal(
			'https://example.com?a=1',
		);
	});
});

describe('isLocalLinkHref', () => {
	it('recognises /{localLink:…} and {localLink:…}', () => {
		expect(isLocalLinkHref(`/{localLink:${DOC}}`)).to.be.true;
		expect(isLocalLinkHref(`{localLink:${DOC}}`)).to.be.true;
	});

	it('recognises URL-encoded braces in any case (D4)', () => {
		expect(isLocalLinkHref(`/%7BlocalLink:${DOC}%7D`)).to.be.true;
		expect(isLocalLinkHref(`/%7blocalLink:${DOC}%7d`)).to.be.true;
	});

	it('does not recognise a token that is not at the start', () => {
		expect(isLocalLinkHref(`https://x.test/?q={localLink:${DOC}}`)).to.be.false;
	});

	it('does not recognise an ordinary URL or a missing href', () => {
		expect(isLocalLinkHref('https://example.com')).to.be.false;
		expect(isLocalLinkHref('')).to.be.false;
		expect(isLocalLinkHref(null)).to.be.false;
		expect(isLocalLinkHref(undefined)).to.be.false;
	});
});

describe('linkFromAttributes', () => {
	it('reads /{localLink:<guid>} as a local link', () => {
		const link = linkFromAttributes({ href: `/{localLink:${DOC}}`, type: 'document' });
		expect(link.unique).to.equal(DOC);
		expect(link.type).to.equal('document');
	});

	it('reads {localLink:<guid>} without a leading slash as a local link', () => {
		expect(linkFromAttributes({ href: `{localLink:${DOC}}`, type: 'document' }).unique).to.equal(DOC);
	});

	it('reads URL-encoded braces in mixed case as a local link (D4)', () => {
		for (const href of [`/%7BlocalLink:${DOC}%7D`, `/%7blocalLink:${DOC}%7d`, `/%7BlocalLink:${DOC}%7d`]) {
			const link = linkFromAttributes({ href, type: 'document' });
			expect(link.unique, href).to.equal(DOC);
			expect(link.type, href).to.equal('document');
		}
	});

	it('reads a token that is not at the start as an external link', () => {
		const link = linkFromAttributes({ href: `https://x.test/?q={localLink:${DOC}}`, type: 'document' });
		expect(link.unique).to.equal(null);
		expect(link.type).to.equal('external');
	});

	it('honours the type attribute only for local links', () => {
		expect(linkFromAttributes({ href: `/{localLink:${MEDIA}}`, type: 'media' }).type).to.equal('media');
		expect(linkFromAttributes({ href: 'https://example.com', type: 'document' }).type).to.equal('external');
		expect(linkFromAttributes({ href: 'https://example.com', type: 'external' }).type).to.equal('external');
		expect(linkFromAttributes({ href: 'https://example.com', type: '' }).type).to.equal('external');
	});

	it('ignores a type attribute that is not a link type', () => {
		expect(linkFromAttributes({ href: `/{localLink:${DOC}}`, type: 'text/html' }).type).to.equal(undefined);
	});

	it('has no type when there is no href', () => {
		expect(linkFromAttributes({}).type).to.equal(undefined);
	});

	it('strips data-anchor from the end of the href, also for a local link', () => {
		const link = linkFromAttributes({ href: `/{localLink:${DOC}}#team`, type: 'document', 'data-anchor': '#team' });
		expect(link.url).to.equal(`/{localLink:${DOC}}`);
		expect(link.queryString).to.equal('#team');
		expect(link.unique).to.equal(DOC);
	});

	it('leaves the href whole when it does not end with data-anchor', () => {
		const link = linkFromAttributes({ href: 'https://example.com/page', 'data-anchor': 'team' });
		expect(link.url).to.equal('https://example.com/page');
	});

	it('maps title to name and keeps the target', () => {
		const link = linkFromAttributes({ href: 'https://example.com', title: 'Example', target: '_blank' });
		expect(link.name).to.equal('Example');
		expect(link.target).to.equal('_blank');
	});
});

describe('read(write(link)) round trip (C-LNK-3)', () => {
	for (const { row, link } of writtenForms) {
		it(`preserves every field for the "${row}" form`, () => {
			expect(fields(linkFromAttributes(attributesFromLink(link)))).to.deep.equal(fields(link));
		});
	}
});
