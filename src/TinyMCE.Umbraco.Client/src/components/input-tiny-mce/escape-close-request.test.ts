// Escape in a TinyMCE dialog inside a block side panel closed the panel too (F-D). The panel is a native <dialog>, and
// Chromium turns an Escape keydown nobody cancelled into a close request for it, while TinyMCE closes its own dialogs
// on keyup. Synthetic events never make a close request, so this needs trusted key presses (`sendKeys`) and a real
// TinyMCE, set up the way the backoffice nests it: inside a shadow root (where TinyMCE puts its UI sink) inside a
// modal <dialog>.
import { expect } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import { loadTinyMce } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import { preventEscapeCloseRequest } from './escape-close-request.js';

describe('preventEscapeCloseRequest', () => {
	let panel: HTMLDialogElement;
	let host: HTMLElement;
	let root: ShadowRoot;
	let editor: Editor;

	before(async () => {
		await loadTinyMce();
		await import('tinymce/themes/silver/theme.js');
		await import('tinymce/models/dom/model.js');
	});

	beforeEach(async () => {
		panel = document.createElement('dialog');
		host = document.createElement('div');
		root = host.attachShadow({ mode: 'open' });
		const target = document.createElement('div');
		root.append(target);
		panel.append(host);
		document.body.append(panel);
		panel.showModal();
		host.addEventListener('keydown', preventEscapeCloseRequest);

		[editor] = await window.tinymce.init({
			target,
			inline: true,
			skin: false,
			content_css: false,
			menubar: false,
			toolbar: false,
			plugins: [],
		});
	});

	afterEach(() => {
		editor.remove();
		panel.close();
		panel.remove();
	});

	it('keeps the enclosing <dialog> open when Escape closes a TinyMCE dialog', async () => {
		editor.windowManager.open({
			title: 'Test dialog',
			body: { type: 'panel', items: [{ type: 'input', name: 'field', label: 'Field' }] },
			buttons: [{ type: 'cancel', text: 'Close' }],
		});
		const field = root.querySelector<HTMLInputElement>('.tox-dialog input');
		// Booleans, not elements: a failing assertion on a live TinyMCE element hangs the browser serialising it.
		expect(!!field, 'the TinyMCE dialog renders inside the shadow root').to.equal(true);
		field!.focus();

		await sendKeys({ press: 'Escape' });

		expect(!!root.querySelector('.tox-dialog'), 'TinyMCE closed its dialog').to.equal(false);
		expect(panel.open, 'the enclosing <dialog> stays open').to.equal(true);
	});

	it('still lets Escape elsewhere close the enclosing <dialog>', async () => {
		const input = document.createElement('input');
		root.append(input);
		input.focus();

		await sendKeys({ press: 'Escape' });

		expect(panel.open).to.equal(false);
	});
});
