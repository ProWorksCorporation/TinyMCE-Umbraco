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
