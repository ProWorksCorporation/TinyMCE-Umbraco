import type { UmbInputTinyMceElement } from '@tiny-mce-umbraco/backoffice/core';
import { customElement, html, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbPropertyEditorUiRteElementBase } from '@umbraco-cms/backoffice/rte';
import { UmbPropertyEditorUiInteractionMemoryManager } from '@umbraco-cms/backoffice/property-editor';
import type { UmbInteractionMemoryModel } from '@umbraco-cms/backoffice/interaction-memory';
import type { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import type { UmbPropertyEditorRteValueType } from '@umbraco-cms/backoffice/rte';

import '@tiny-mce-umbraco/backoffice/core';

/**
 * @element umb-property-editor-ui-tiny-mce
 */
@customElement('umb-property-editor-ui-tiny-mce')
export class UmbPropertyEditorUITinyMceElement extends UmbPropertyEditorUiRteElementBase {
	// Keeps what the input's modals remember (e.g. the media picker's last folder) in Umbraco's app-level store,
	// keyed by a hash of this Data Type's configuration, so it survives the editor being recreated for the rest of
	// the backoffice session. Mirrors Tiptap's property editor UI, with its own prefix.
	readonly #interactionMemoryManager = new UmbPropertyEditorUiInteractionMemoryManager(this, {
		memoryUniquePrefix: 'UmbTinyMce',
	});

	@state()
	private _interactionMemories: Array<UmbInteractionMemoryModel> = [];

	/**
	 * True while a value is being set from outside. Changes the editor reports meanwhile are echoes of that value,
	 * not edits, and must not be reported back (FR-042). On a culture switch Umbraco 17.8's `umb-property` points
	 * its data path at the new culture, sets that culture's value on this (old) element, and only then replaces the
	 * element. The block picker reacts to the new block contents by inserting them into the old editor and firing a
	 * change, which `umb-property` would store under the new culture: the old culture's text leaked into it.
	 */
	#settingValue = false;

	public override set value(value: UmbPropertyEditorRteValueType | undefined) {
		this.#settingValue = true;
		try {
			super.value = value;
		} finally {
			this.#settingValue = false;
		}
	}
	public override get value(): UmbPropertyEditorRteValueType | undefined {
		return super.value;
	}

	public override set config(config: UmbPropertyEditorConfigCollection | undefined) {
		// Unconditionally, and before the base's own guard: without a config hash there is no key to store the
		// memories under.
		this.#interactionMemoryManager.setPropertyEditorConfig(config);
		super.config = config;
	}

	constructor() {
		super();

		this.observe(
			this.#interactionMemoryManager.memoriesForPropertyEditor,
			(memories) => {
				this._interactionMemories = memories ?? [];
			},
			null,
		);
	}

	async #onInteractionMemoriesChange(event: Event) {
		const memories = (event.target as UmbInputTinyMceElement).interactionMemories;

		if (memories && memories.length > 0) {
			await this.#interactionMemoryManager.saveMemoriesForPropertyEditor(memories);
		} else {
			await this.#interactionMemoryManager.deleteMemoriesForPropertyEditor();
		}
	}

	#onChange(event: CustomEvent & { target: UmbInputTinyMceElement }) {
		if (this.#settingValue) return;

		const markup = typeof event.target.value === 'string' ? event.target.value : '';

		// If we don't get any markup clear the property editor value.
		if (markup === '') {
			this.value = undefined;
			this._fireChangeEvent();
			return;
		}

		// Remove unused Blocks of Blocks Layout. Leaving only the Blocks that are present in Markup.
		const usedContentKeys: string[] = [];

		// Regex matching all block elements in the markup, and extracting the content key. It's the same as the one used on the backend.
		const regex = new RegExp(
			/<umb-rte-block(?:-inline)?(?: class="(?:.[^"]*)")? data-content-key="(?<key>.[^"]*)">(?:<!--Umbraco-Block-->)?<\/umb-rte-block(?:-inline)?>/gi,
		);
		let blockElement: RegExpExecArray | null;
		while ((blockElement = regex.exec(markup)) !== null) {
			if (blockElement.groups?.key) {
				usedContentKeys.push(blockElement.groups.key);
			}
		}

		if (this.value) {
			this.value = {
				...this.value,
				markup: markup,
			};
		} else {
			this.value = {
				markup: markup,
				blocks: {
					layout: {},
					contentData: [],
					settingsData: [],
					expose: [],
				},
			};
		}

		// lets run this one after we set the value, to make sure we don't reset the value.
		this._filterUnusedBlocks(usedContentKeys);

		this._fireChangeEvent();
	}

	override render() {
		return html`
			<umb-input-tiny-mce
				.configuration=${this._config}
				.value=${this._markup}
				.interactionMemories=${this._interactionMemories}
				@change=${this.#onChange}
				@interaction-memories-change=${this.#onInteractionMemoriesChange}
				?readonly=${this.readonly}>
			</umb-input-tiny-mce>
		`;
	}
}

export default UmbPropertyEditorUITinyMceElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-tiny-mce': UmbPropertyEditorUITinyMceElement;
	}
}
