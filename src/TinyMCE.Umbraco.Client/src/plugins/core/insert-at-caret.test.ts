// Inserting next to a block (F-1 in specs/004-upgrade-umbraco-17-8/test-run-claude-2026-11-13.md). Runs against a
// real TinyMCE editor because the failure lives in TinyMCE's own selection handling: after a block is inserted, the
// caret sits on TinyMCE's *fake caret* beside it, a bogus element that serialisation strips.
import { expect } from '@open-wc/testing';
import { loadTinyMce } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import { defaultFallbackConfig } from '../../components/input-tiny-mce/input-tiny-mce.defaults.js';
import { insertAtCaret } from './insert-at-caret.js';

// Stands in for Umbraco's `umb-rte-block`, which marks itself non-editable when it connects - the property that
// makes TinyMCE treat it as a block it cannot put the caret inside.
if (!customElements.get('umb-rte-block')) {
	customElements.define(
		'umb-rte-block',
		class extends HTMLElement {
			override connectedCallback() {
				this.setAttribute('contenteditable', 'false');
			}
		}
	);
}

const block = (key: string) => `<umb-rte-block data-content-key="${key}"></umb-rte-block>`;
// A 1x1 GIF, so the test makes no network request.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const image = (alt: string) => `<img src="${PIXEL}" alt="${alt}">`;

describe('insertAtCaret', () => {
	let editor: Editor;
	let target: HTMLElement;

	before(async () => {
		const tinymce = await loadTinyMce();
		await import('tinymce/themes/silver/theme.js');
		await import('tinymce/models/dom/model.js');
		target = document.createElement('div');
		document.body.append(target);
		[editor] = await tinymce.init({
			target,
			inline: true,
			skin: false,
			content_css: false,
			menubar: false,
			toolbar: false,
			plugins: [],
			relative_urls: false,
			valid_elements: defaultFallbackConfig.valid_elements,
			extended_valid_elements: defaultFallbackConfig.extended_valid_elements,
			custom_elements: defaultFallbackConfig.custom_elements,
		});
	});

	after(() => {
		editor.remove();
		target.remove();
	});

	beforeEach(() => {
		editor.setContent('<p>Intro</p>');
		editor.focus();
		editor.selection.select(editor.getBody().querySelector('p')!, true);
		editor.selection.collapse(false);
	});

	it('keeps a second block inserted straight after the first', () => {
		insertAtCaret(editor, block('first'));
		insertAtCaret(editor, block('second'));

		const saved = editor.getContent();
		expect(saved).to.contain('data-content-key="first"');
		expect(saved).to.contain('data-content-key="second"');
	});

	it('keeps an image inserted straight after a block', () => {
		insertAtCaret(editor, block('first'));
		insertAtCaret(editor, image('after the block'));

		expect(editor.getContent()).to.contain('alt="after the block"');
	});

	it('keeps an embed inserted straight after a block', () => {
		insertAtCaret(editor, block('first'));
		insertAtCaret(
			editor,
			'<div class="mceNonEditable umb-embed-holder" contenteditable="false" data-embed-url="https://example.com/v"><iframe src="about:blank"></iframe></div>'
		);

		expect(editor.getContent()).to.contain('data-embed-url="https://example.com/v"');
	});

	// F-A2 (specs/004-upgrade-umbraco-17-8/smoke-test-outcome.md): with the caret inside the end of a link, a block
	// landed inside the <a>, which the schema doesn't allow, so it showed in the editor but was left out of the saved
	// content. The link is made the way the link picker plugin (tiny-mce-multi-url-picker.plugin.ts) makes it: `CreateLink` on
	// the selected last word, or `mceInsertContent` of a new <a> when nothing is selected. `CreateLink` leaves the word
	// selected (and inserting then replaces it, as typing would), so the caret is moved to the end of the link first,
	// inside the <a>: where F-A2 lost the block. These fail with `selection.setContent()`, which the block picker used
	// until the F-1 fix; checked in the backoffice too, with TinyMCE's own inline-boundary caret (End, then Left).
	const linkInserts: Array<[string, () => void]> = [
		[
			'CreateLink on the last word',
			() => {
				editor.setContent('<p>Intro link</p>');
				const text = editor.getBody().querySelector('p')!.firstChild!;
				const range = editor.dom.createRng();
				range.setStart(text, 6);
				range.setEnd(text, 10);
				editor.selection.setRng(range);
				editor.execCommand('CreateLink', false, { href: 'https://example.com/' } as unknown as string);
				const linkText = editor.getBody().querySelector('a')!.firstChild!;
				editor.selection.setCursorLocation(linkText, linkText.textContent!.length);
			},
		],
		[
			'mceInsertContent of a new link',
			() => {
				editor.setContent('<p>Intro </p>');
				editor.selection.select(editor.getBody().querySelector('p')!, true);
				editor.selection.collapse(false);
				editor.execCommand('mceInsertContent', false, '<a href="https://example.com/">link</a>');
			},
		],
	];

	for (const [how, insertLink] of linkInserts) {
		describe(`straight after a link is inserted (${how})`, () => {
			beforeEach(insertLink);

			it('keeps a block, outside the link', () => {
				insertAtCaret(editor, block('after-link'));

				const saved = editor.getContent();
				expect(saved).to.contain('data-content-key="after-link"');
				expect(saved, 'the link is unchanged').to.contain('<a href="https://example.com/">link</a>');
				expect(!!editor.getBody().querySelector('a umb-rte-block'), 'not inside the link').to.equal(false);
			});

			it('keeps an image', () => {
				insertAtCaret(editor, image('after the link'));

				expect(editor.getContent()).to.contain('alt="after the link"');
			});
		});
	}

	it('inserts at the caret in ordinary text', () => {
		insertAtCaret(editor, image('in text'));

		expect(editor.getContent()).to.equal(`<p>Intro${image('in text')}</p>`);
	});
});
