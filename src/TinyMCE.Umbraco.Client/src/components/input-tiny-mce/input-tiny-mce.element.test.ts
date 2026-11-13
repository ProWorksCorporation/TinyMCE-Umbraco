// Component tests for the interaction-memory wiring of <umb-input-tiny-mce> (US6, FR-028), ported from Umbraco
// 17.8's input-tiptap.test.ts and entity-input-interaction-memory.manager.test.ts.
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { customElement } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import {
	UMB_INTERACTION_MEMORY_SCOPE_CONTEXT,
	UmbInteractionMemoriesChangeEvent,
} from '@umbraco-cms/backoffice/interaction-memory';
import { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UmbInputTinyMceElement } from './input-tiny-mce.element.js';

// The memory wiring is set up in the constructor and needs the element connected, so these tests mount it. Skipping
// `firstUpdated` keeps TinyMCE itself from booting: that needs the server context, the plugin manifests and the
// package's configuration endpoint, none of which a unit test has, and the memory wiring does not depend on it.
@customElement('test-input-tiny-mce-interaction-memory')
class UmbTestInputTinyMceElement extends UmbInputTinyMceElement {
	override firstUpdated() {}
}

// Stands in for what a plugin controller or a modal opened from the editor sees: a consumer below the element.
@customElement('test-input-tiny-mce-memory-child')
class UmbTestMemoryChildElement extends UmbElementMixin(HTMLElement) {}

describe('UmbInputTinyMceElement interaction memory', () => {
	let element: UmbTestInputTinyMceElement;

	// What the media picker modal stores when it is opened from the editor toolbar.
	const memory = {
		unique: 'UmbPickerModal:Umb.Modal.MediaPicker',
		memories: [{ unique: 'UmbMediaItemPickerLocation', value: { entity: { unique: 'folder-1' } } }],
	};

	const scopeOf = async (host: UmbInputTinyMceElement) => {
		const scope = (await host.getContext(UMB_INTERACTION_MEMORY_SCOPE_CONTEXT))?.memory;
		expect(scope, 'interaction-memory scope provided').to.not.equal(undefined);
		return scope!;
	};

	beforeEach(async () => {
		element = await fixture(html`<test-input-tiny-mce-interaction-memory></test-input-tiny-mce-interaction-memory>`);
	});

	it('renders without errors when interactionMemories is never set', () => {
		expect(element.shadowRoot?.querySelector('.editor'), 'editor target rendered').to.not.equal(null);
		expect(element.interactionMemories).to.deep.equal([]);
	});

	it('provides itself as the interaction-memory scope for the modals it opens', async () => {
		await scopeOf(element);
	});

	it('makes memories set on the property reachable by a child consumer of the scope', async () => {
		element.interactionMemories = [memory];

		const child = new UmbTestMemoryChildElement();
		element.shadowRoot!.appendChild(child);
		const scope = (await child.getContext(UMB_INTERACTION_MEMORY_SCOPE_CONTEXT))?.memory;

		expect(scope?.getMemory(memory.unique)).to.deep.equal(memory);
	});

	it('drops memories that are no longer present when the property is set again', async () => {
		const scope = await scopeOf(element);
		element.interactionMemories = [memory];
		element.interactionMemories = [];
		expect(scope.getMemory(memory.unique)).to.equal(undefined);
	});

	it('dispatches interaction-memories-change carrying the memory when the scope is written to', async () => {
		const scope = await scopeOf(element);
		const listener = oneEvent(element, UmbInteractionMemoriesChangeEvent.TYPE);
		scope.setMemory(memory);
		await listener;
		expect(element.interactionMemories).to.deep.equal([memory]);
	});

	it('does not dispatch interaction-memories-change for memories it was just handed', async () => {
		await scopeOf(element);
		let dispatched = false;
		element.addEventListener(UmbInteractionMemoriesChangeEvent.TYPE, () => (dispatched = true));
		element.interactionMemories = [memory];
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(dispatched).to.equal(false);
	});
});

// Inline mode hands TinyMCE a container of our own for its toolbar (`fixed_toolbar_container_target`), because its
// floating toolbar cannot be positioned inside the backoffice's nested shadow DOM - see "Inline Mode and Shadow DOM"
// in the client CLAUDE.md. Only the rendered structure can be checked here: whether the toolbar then shows, sticks and
// hides is rendering, which a component test cannot reach.
describe('UmbInputTinyMceElement inline toolbar container', () => {
	const mount = (mode: string) =>
		fixture<UmbTestInputTinyMceElement>(
			html`<test-input-tiny-mce-interaction-memory
				.configuration=${new UmbPropertyEditorConfigCollection([{ alias: 'mode', value: mode }])}></test-input-tiny-mce-interaction-memory>`
		);

	it('renders a toolbar container directly before the editable element in inline mode', async () => {
		const element = await mount('inline');
		const editor = element.shadowRoot!.querySelector('.editor');
		expect(editor?.previousElementSibling?.classList.contains('inline-toolbar')).to.equal(true);
	});

	it('renders no toolbar container in classic mode', async () => {
		const element = await mount('classic');
		expect(element.shadowRoot!.querySelector('.inline-toolbar')).to.equal(null);
	});
});

// Umbraco's router turns every plain click on a same-origin link anywhere in the page into a navigation, including a
// link in the text of an inline editor (`/{localLink:...}`), which took the editor off the page to a blank one.
describe('UmbInputTinyMceElement link clicks in inline mode', () => {
	let element: UmbTestInputTinyMceElement;
	let reachedWindow: Array<string>;
	// Records what the router would see, and stops the test page itself from following the link.
	const onWindowClick = (event: Event) => {
		reachedWindow.push((event.composedPath()[0] as Element).id);
		event.preventDefault();
	};

	beforeEach(async () => {
		element = await fixture<UmbTestInputTinyMceElement>(
			html`<test-input-tiny-mce-interaction-memory
				.configuration=${new UmbPropertyEditorConfigCollection([{ alias: 'mode', value: 'inline' }])}></test-input-tiny-mce-interaction-memory>`
		);
		reachedWindow = [];
		window.addEventListener('click', onWindowClick);
		// A real click on a link in editable content is not followed by the browser; a synthetic one is, so cancel it here
		// (on the element itself, as the window listener above no longer sees the clicks this feature stops).
		editable().addEventListener('click', (event) => event.preventDefault());
	});

	afterEach(() => window.removeEventListener('click', onWindowClick));

	const editable = () => element.shadowRoot!.querySelector<HTMLElement>('.editor')!;
	const click = (target: Element, init: MouseEventInit = {}) =>
		target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init }));

	it('keeps a plain click on a link in the text from reaching the router', () => {
		editable().innerHTML = '<p><a id="content-link" href="/{localLink:umb://document/1}"><strong id="bold">x</strong></a></p>';
		click(editable().querySelector('#content-link')!);
		click(editable().querySelector('#bold')!);
		expect(reachedWindow).to.deep.equal([]);
	});

	it('lets a Ctrl or Cmd click on a link through', () => {
		editable().innerHTML = '<p><a id="content-link" href="/{localLink:umb://document/1}">x</a></p>';
		click(editable().querySelector('#content-link')!, { ctrlKey: true });
		click(editable().querySelector('#content-link')!, { metaKey: true });
		expect(reachedWindow).to.deep.equal(['content-link', 'content-link']);
	});

	it("lets a click on a block's own links through, which is how its Edit action opens", () => {
		const block = document.createElement('div');
		block.attachShadow({ mode: 'open' }).innerHTML = '<a id="block-edit" href="/edit-block">Edit</a>';
		editable().append(block);
		click(block.shadowRoot!.querySelector('#block-edit')!);
		expect(reachedWindow).to.deep.equal(['block-edit']);
	});

	it('lets clicks on anything other than a link through', () => {
		editable().innerHTML = '<p id="text">x</p>';
		click(editable().querySelector('#text')!);
		expect(reachedWindow).to.deep.equal(['text']);
	});
});

// TinyMCE places inline dialogs (Ask AI is 800px wide) at the editor's left edge and never further left, so one wider
// than the editor ran off the right of the window with its send button. A stand-in dialog in a stand-in sink, put
// where TinyMCE puts its sink (classic: straight into this shadow root; inline: inside our toolbar container), must
// come out no wider than the element.
describe('UmbInputTinyMceElement inline dialog width', () => {
	for (const mode of ['classic', 'inline']) {
		it(`caps an inline dialog at the editor's width in ${mode} mode`, async () => {
			const container = await fixture<HTMLDivElement>(html`<div style="width: 400px"></div>`);
			const element = document.createElement('test-input-tiny-mce-interaction-memory') as UmbTestInputTinyMceElement;
			element.configuration = new UmbPropertyEditorConfigCollection([{ alias: 'mode', value: mode }]);
			container.append(element);
			await element.updateComplete;
			const sinkParent: ParentNode =
				mode === 'inline' ? element.shadowRoot!.querySelector('.inline-toolbar')! : element.shadowRoot!;
			const sink = document.createElement('div');
			sink.className = 'tox tox-silver-sink tox-tinymce-aux';
			sink.innerHTML = '<div class="tox-dialog tox-dialog-inline" style="width: 800px"></div>';
			sinkParent.appendChild(sink);

			const dialog = sink.querySelector<HTMLElement>('.tox-dialog-inline')!;
			expect(dialog.getBoundingClientRect().width).to.equal(400);
		});
	}
});
