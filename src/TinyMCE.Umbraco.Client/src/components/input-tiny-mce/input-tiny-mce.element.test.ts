// Component tests for the interaction-memory wiring of <umb-input-tiny-mce> (US6, FR-028), ported from Umbraco
// 17.8's input-tiptap.test.ts and entity-input-interaction-memory.manager.test.ts.
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { customElement } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import {
	UMB_INTERACTION_MEMORY_SCOPE_CONTEXT,
	UmbInteractionMemoriesChangeEvent,
} from '@umbraco-cms/backoffice/interaction-memory';
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
