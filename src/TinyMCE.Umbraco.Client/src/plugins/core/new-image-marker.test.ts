// The media picker finds the image it has just inserted by a temporary id. Runs against a real TinyMCE editor
// because what matters is how that id survives TinyMCE's insert and serialisation.
import { expect } from '@open-wc/testing';
import { loadTinyMce } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import { defaultFallbackConfig } from '../../components/input-tiny-mce/input-tiny-mce.defaults.js';
import { insertAtCaret } from './insert-at-caret.js';
import { newImageMarkerId, stripNewImageMarkers } from './new-image-marker.js';

// A 1x1 GIF, so the test makes no network request.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

describe('new image marker', () => {
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
			// The plugin registers this while TinyMCE is still setting up, before the serializer exists.
			setup: (ed: Editor) => stripNewImageMarkers(ed),
		});
	});

	after(() => {
		editor.remove();
		target.remove();
	});

	// Content saved before the inline-mode fixes in 17.6.2 can carry the old fixed id: the image was never found
	// again, so its id was never removed.
	const STALE = `<p><img id="__mcenew" src="${PIXEL}" alt="old" width="200" height="208"></p>`;

	beforeEach(() => {
		editor.setContent(STALE + '<p>Intro</p>');
		editor.focus();
		editor.selection.select(editor.getBody().querySelectorAll('p')[1], true);
		editor.selection.collapse(false);
	});

	it('finds the new image, not an image left with the old fixed id', () => {
		const id = newImageMarkerId();
		insertAtCaret(editor, `<img id="${id}" src="${PIXEL}" alt="new">`);

		expect(editor.dom.get(id)?.getAttribute('alt')).to.equal('new');
	});

	it('gives every insert its own id', () => {
		expect(newImageMarkerId()).to.not.equal(newImageMarkerId());
	});

	it('never saves a marker id, old or new', () => {
		insertAtCaret(editor, `<img id="${newImageMarkerId()}" src="${PIXEL}" alt="new">`);

		const saved = editor.getContent();
		expect(saved).to.not.contain('__mcenew');
		expect(saved).to.contain('alt="old"');
		expect(saved).to.contain('alt="new"');
	});

	it('keeps other ids', () => {
		editor.setContent(`<p><img id="hero" src="${PIXEL}" alt="kept"></p>`);

		expect(editor.getContent()).to.contain('id="hero"');
	});
});
