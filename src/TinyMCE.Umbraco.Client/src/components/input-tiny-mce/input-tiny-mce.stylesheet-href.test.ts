// Stylesheet resolution for the editor's content_css (US8, FR-041). The first five cases are Umbraco 17.8's own
// resolve-stylesheet-href.function.test.ts; the rest cover what this package adds or depends on.
import { expect } from '@open-wc/testing';
import { BehaviorSubject } from '@umbraco-cms/backoffice/external/rxjs';
import { resolveStylesheetHref, resolveStylesheetHrefs } from './input-tiny-mce.stylesheet-href.js';

describe('resolveStylesheetHref', () => {
	it('prefixes the root path onto a configured stylesheet', () => {
		const href = resolveStylesheetHref('/rte-test.css', '/mycss', '');
		expect(href).to.equal(`${window.location.origin}/mycss/rte-test.css`);
	});

	it('does not double up the root path when the configured stylesheet already includes it', () => {
		const href = resolveStylesheetHref('/mycss/already-prefixed.css', '/mycss', '');
		expect(href).to.equal(`${window.location.origin}/mycss/already-prefixed.css`);
	});

	it('resolves against the server origin when one is set, e.g. a split Vite dev client', () => {
		const href = resolveStylesheetHref('/rte-test.css', '/mycss', 'https://localhost:44339');
		expect(href).to.equal('https://localhost:44339/mycss/rte-test.css');
	});

	it('leaves a protocol-relative stylesheet URL untouched', () => {
		const href = resolveStylesheetHref('//cdn.example.com/style.css', '/mycss', 'https://localhost:44339');
		expect(href).to.equal('//cdn.example.com/style.css');
	});

	it('leaves an absolute stylesheet URL untouched', () => {
		const href = resolveStylesheetHref('https://cdn.example.com/style.css', '/mycss', 'https://localhost:44339');
		expect(href).to.equal('https://cdn.example.com/style.css');
	});

	it('normalises backslashes to forward slashes before resolving', () => {
		const href = resolveStylesheetHref('\\folder\\x.css', '/css', 'https://server.test');
		expect(href).to.equal('https://server.test/css/folder/x.css');
	});

	it('uses the default root path', () => {
		const href = resolveStylesheetHref('/rte-test.css', '/css', 'https://server.test');
		expect(href).to.equal('https://server.test/css/rte-test.css');
	});
});

describe('resolveStylesheetHrefs', () => {
	const delayed = (value: string, ms: number) => {
		const rootPath = new BehaviorSubject<string | undefined>(undefined);
		setTimeout(() => rootPath.next(value), ms);
		return rootPath.asObservable();
	};

	it('waits for the root path before resolving, so a non-default UmbracoCssPath is never missed', async () => {
		const hrefs = await resolveStylesheetHrefs(
			['/rte-test.css', '//cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css'],
			delayed('/mycss', 50),
			() => 'https://server.test',
		);

		expect(hrefs).to.include('https://server.test/mycss/rte-test.css');
		expect(hrefs.some((href) => href.startsWith('https://server.test/css/'))).to.equal(false);
		expect(hrefs).to.include('//cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css');
	});

	it("appends Umbraco's rte-content.css as an absolute URL on the server origin", async () => {
		const hrefs = await resolveStylesheetHrefs(['/rte-test.css'], delayed('/mycss', 0), () => 'https://server.test');

		expect(hrefs[hrefs.length - 1]).to.equal('https://server.test/umbraco/backoffice/css/rte-content.css');
	});

	it('reads the server URL only once the root path is known', async () => {
		let serverUrl = '';
		const rootPath = new BehaviorSubject<string | undefined>(undefined);
		const result = resolveStylesheetHrefs(['/rte-test.css'], rootPath.asObservable(), () => serverUrl);
		// The server context sets both together; the URL is filled in before the root path arrives.
		serverUrl = 'https://server.test';
		rootPath.next('/css');

		expect(await result).to.deep.equal([
			'https://server.test/css/rte-test.css',
			'https://server.test/umbraco/backoffice/css/rte-content.css',
		]);
	});
});
