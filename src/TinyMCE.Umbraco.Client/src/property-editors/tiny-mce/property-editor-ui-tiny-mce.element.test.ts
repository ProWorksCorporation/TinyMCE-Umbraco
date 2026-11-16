// Component tests for the interaction-memory wiring of the TinyMCE property editor UI (US6, FR-028/029), ported from
// Umbraco 17.8's property-editor-ui-tiptap.test.ts and property-editor-ui-interaction-memory.manager.test.ts.
import { expect } from '@open-wc/testing';
import { customElement } from '@umbraco-cms/backoffice/external/lit';
import { UmbControllerHostElementMixin } from '@umbraco-cms/backoffice/controller-api';
import {
	UMB_INTERACTION_MEMORY_SCOPE_CONTEXT,
	UmbInteractionMemoryContext,
} from '@umbraco-cms/backoffice/interaction-memory';
import type { UmbInteractionMemoryModel } from '@umbraco-cms/backoffice/interaction-memory';
import { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UMB_BLOCK_RTE_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-rte';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import type { UmbPropertyEditorRteValueType } from '@umbraco-cms/backoffice/rte';
import { UmbInputTinyMceElement } from '@tiny-mce-umbraco/backoffice/core';
import { UmbPropertyEditorUITinyMceElement } from './property-editor-ui-tiny-mce.element.js';

// Stands in for the app root, where Umbraco keeps the one interaction-memory store for the backoffice session.
@customElement('test-tiny-mce-property-editor-memory-host')
class UmbTestMemoryHostElement extends UmbControllerHostElementMixin(HTMLElement) {
	public readonly interactionMemoryContext = new UmbInteractionMemoryContext(this);
}

type StoredMemory = UmbInteractionMemoryModel & { memories?: Array<UmbInteractionMemoryModel> };

describe('UmbPropertyEditorUITinyMceElement interaction memory', () => {
	// What the media picker modal stores when it is opened from the editor toolbar.
	const memory = {
		unique: 'UmbPickerModal:Umb.Modal.MediaPicker',
		memories: [{ unique: 'UmbMediaItemPickerLocation', value: { entity: { unique: 'folder-1' } } }],
	};
	const config = (mode = 'classic') => new UmbPropertyEditorConfigCollection([{ alias: 'mode', value: mode }]);

	let host: UmbTestMemoryHostElement;

	// The inner <umb-input-tiny-mce> would boot TinyMCE in `firstUpdated`, which needs the server context, plugin
	// manifests and the configuration endpoint. The memory wiring under test does not depend on any of that.
	const realFirstUpdated = UmbInputTinyMceElement.prototype.firstUpdated;
	before(() => {
		UmbInputTinyMceElement.prototype.firstUpdated = function () {};
	});
	after(() => {
		UmbInputTinyMceElement.prototype.firstUpdated = realFirstUpdated;
	});

	const addPropertyEditor = async (editorConfig: UmbPropertyEditorConfigCollection | undefined = config()) => {
		const propertyEditor = new UmbPropertyEditorUITinyMceElement();
		propertyEditor.config = editorConfig;
		host.appendChild(propertyEditor);
		await propertyEditor.updateComplete;
		const input = propertyEditor.shadowRoot!.querySelector<UmbInputTinyMceElement>('umb-input-tiny-mce')!;
		await input.updateComplete;
		const scope = (await input.getContext(UMB_INTERACTION_MEMORY_SCOPE_CONTEXT))?.memory;
		expect(scope, 'interaction-memory scope provided by the input').to.not.equal(undefined);
		return { propertyEditor, input, scope: scope! };
	};

	const storedMemories = () => host.interactionMemoryContext.memory.getAllMemories() as Array<StoredMemory>;

	const nextStoredMemories = () =>
		new Promise<Array<StoredMemory>>((resolve) => {
			host.interactionMemoryContext.memory.memories.subscribe((memories) => {
				if (memories.length > 0) resolve(memories as Array<StoredMemory>);
			});
		});

	beforeEach(() => {
		host = new UmbTestMemoryHostElement();
		document.body.appendChild(host);
	});

	afterEach(() => {
		host.remove();
	});

	it('saves memories written to the input scope into the app-root store, under its own prefix', async () => {
		const { scope } = await addPropertyEditor();
		scope.setMemory(memory);

		const stored = await nextStoredMemories();
		expect(stored).to.have.lengthOf(1);
		expect(stored[0].unique.startsWith('UmbTinyMcePropertyEditorUi'), stored[0].unique).to.equal(true);
		expect(stored[0].memories).to.deep.equal([memory]);
	});

	it('passes the saved memories to the inner umb-input-tiny-mce once config is set', async () => {
		const first = await addPropertyEditor();
		first.scope.setMemory(memory);
		await nextStoredMemories();
		first.propertyEditor.remove();

		const { propertyEditor, input } = await addPropertyEditor();
		await propertyEditor.updateComplete;

		expect(input.interactionMemories).to.deep.equal([memory]);
	});

	it('keeps a separate memory per Data Type configuration', async () => {
		const classic = await addPropertyEditor(config('classic'));
		classic.scope.setMemory(memory);
		await nextStoredMemories();

		const { input } = await addPropertyEditor(config('inline'));

		expect(input.interactionMemories).to.deep.equal([]);
	});

	it('deletes the stored memories when the input reports an empty list', async () => {
		const { scope } = await addPropertyEditor();
		scope.setMemory(memory);
		await nextStoredMemories();

		scope.deleteMemory(memory.unique);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(storedMemories()).to.deep.equal([]);
	});

	it('saves memories for a property editor that has no configuration', async () => {
		const { scope } = await addPropertyEditor(undefined);
		scope.setMemory(memory);

		const stored = await nextStoredMemories();
		expect(stored).to.have.lengthOf(1);
		expect(stored[0].memories).to.deep.equal([memory]);
	});
});

// FR-042 (quickstart H9): on a culture switch, Umbraco 17.8's umb-property points its data path at the new culture,
// pushes that culture's value into the *old* editor element, and only then replaces the element. TinyMCE's block
// picker reacts to the new block contents by inserting the new culture's blocks into the old editor and firing a
// change, which umb-property stored under the new culture: the old culture's text leaked into the new one.
describe('UmbPropertyEditorUITinyMceElement value set from outside', () => {
	const realFirstUpdated = UmbInputTinyMceElement.prototype.firstUpdated;
	before(() => {
		UmbInputTinyMceElement.prototype.firstUpdated = function () {};
	});
	after(() => {
		UmbInputTinyMceElement.prototype.firstUpdated = realFirstUpdated;
	});

	const blockValue = (culture: string, key: string): UmbPropertyEditorRteValueType => ({
		markup: `<p>${culture} intro</p><umb-rte-block data-content-key="${key}"><!--Umbraco-Block--></umb-rte-block>`,
		blocks: {
			layout: { 'Umbraco.RichText': [{ contentKey: key }] },
			contentData: [{ key, contentTypeKey: 'block-type', values: [] }],
			settingsData: [],
			expose: [],
		},
	});

	let host: UmbTestMemoryHostElement;
	let propertyEditor: UmbPropertyEditorUITinyMceElement;
	let input: UmbInputTinyMceElement;
	let changes: number;

	beforeEach(async () => {
		host = new UmbTestMemoryHostElement();
		document.body.appendChild(host);
		propertyEditor = new UmbPropertyEditorUITinyMceElement();
		propertyEditor.config = new UmbPropertyEditorConfigCollection([]);
		propertyEditor.value = blockValue('en-US', 'en-block');
		host.appendChild(propertyEditor);
		await propertyEditor.updateComplete;
		input = propertyEditor.shadowRoot!.querySelector<UmbInputTinyMceElement>('umb-input-tiny-mce')!;
		await input.updateComplete;

		// Stand in for the block picker plugin: whenever the block contents change, it updates the editor and fires
		// a change from the input.
		const manager = await input.getContext(UMB_BLOCK_RTE_MANAGER_CONTEXT);
		input.observe(manager!.contents, () => input.dispatchEvent(new UmbChangeEvent()), 'testBlockPicker');

		changes = 0;
		propertyEditor.addEventListener(UmbChangeEvent.TYPE, () => changes++);
	});

	afterEach(() => {
		host.remove();
	});

	it('does not report a change while its value is being set from outside', () => {
		propertyEditor.value = blockValue('da-DK', 'da-block');
		expect(changes).to.equal(0);
	});

	it('still reports changes that come from the editor', () => {
		input.dispatchEvent(new UmbChangeEvent());
		expect(changes).to.equal(1);
	});
});
