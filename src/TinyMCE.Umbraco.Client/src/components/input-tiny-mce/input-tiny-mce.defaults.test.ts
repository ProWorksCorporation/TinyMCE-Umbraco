// The classic-mode iframe bootstrap in `init_instance_callback`. A test cannot run the iframe realm (see the client
// CLAUDE.md, "TinyMCE iframe Module Scope"), so these check the module script the callback builds: the order of what
// it loads is the whole fix for F-G2, and nothing fails visibly when it regresses.
import { expect } from '@open-wc/testing';
import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import { defaultFallbackConfig, UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH } from './input-tiny-mce.defaults.js';

// An inert document stands in for the iframe's: scripts appended to it never run.
function fakeEditor(withIframe: boolean) {
	const doc = document.implementation.createHTMLDocument('');
	const editor = {
		iframeElement: withIframe ? document.createElement('iframe') : null,
		dom: { doc },
	} as unknown as Editor;
	return { editor, doc };
}

function runCallback(editor: Editor) {
	(defaultFallbackConfig.init_instance_callback as (editor: Editor) => void)(editor);
}

/** The injected module script that loads the block components. */
function blockScript(doc: Document): string {
	const script = [...doc.head.querySelectorAll('script[type="module"]')].find((s) =>
		s.textContent?.includes(UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH),
	);
	expect(script, 'the module script that loads the block components').to.exist;
	return script!.textContent!;
}

describe('init_instance_callback (classic iframe bootstrap)', () => {
	it('defines the ufm-* label elements before it loads the block components', () => {
		// Since Umbraco 17.8 a block's name (delete dialog, clipboard entry) comes only from the label's
		// umb-ufm-resolved event, which misses a <ufm-label-value> upgraded after the blocks rendered (F-G2).
		const { editor, doc } = fakeEditor(true);
		runCallback(editor);
		const text = blockScript(doc);

		const ufm = text.indexOf('/umbraco/backoffice/packages/ufm/umbraco-package.js');
		const blocks = text.indexOf(`await import("${UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH}")`);
		expect(ufm, 'ufm package import').to.be.greaterThan(-1);
		expect(blocks, 'dynamic import of the block components').to.be.greaterThan(ufm);
	});

	it('never imports the block components statically, which would run before the ufm definitions', () => {
		const { editor, doc } = fakeEditor(true);
		runCallback(editor);

		expect(blockScript(doc)).to.not.match(
			new RegExp(`^\\s*import\\s+["']${UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH}["']`, 'm'),
		);
	});

	it('loads the block components outside the ufm try/catch, so a ufm failure cannot leave blocks unrendered', () => {
		const { editor, doc } = fakeEditor(true);
		runCallback(editor);
		const lines = blockScript(doc).split('\n');
		const indent = (line: string | undefined) => line?.match(/^\s*/)?.[0];

		// The outer try of the ufm block, and the block import: same nesting level, so the import is outside it.
		const ufmTry = lines.find((line) => /^\s*try\s*{\s*$/.test(line));
		const blockImport = lines.find((line) =>
			line.includes(`await import("${UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH}")`),
		);
		expect(ufmTry, 'the try around the ufm definitions').to.exist;
		expect(indent(blockImport)).to.equal(indent(ufmTry));
	});

	it('does nothing in inline mode, where the editor document is the backoffice document', () => {
		const { editor, doc } = fakeEditor(false);
		runCallback(editor);

		expect(doc.head.querySelectorAll('script, link').length).to.equal(0);
	});
});
