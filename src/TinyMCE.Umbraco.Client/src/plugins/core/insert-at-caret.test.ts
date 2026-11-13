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

	it('inserts at the caret in ordinary text', () => {
		insertAtCaret(editor, image('in text'));

		expect(editor.getContent()).to.equal(`<p>Intro${image('in text')}</p>`);
	});
});
