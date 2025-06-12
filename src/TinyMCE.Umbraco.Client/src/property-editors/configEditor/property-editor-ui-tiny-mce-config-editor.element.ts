import { css, customElement, html, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { PropertyValueMap } from '@umbraco-cms/backoffice/external/lit';
import type {
	UmbPropertyEditorUiElement,
	UmbPropertyEditorConfigCollection,
} from '@umbraco-cms/backoffice/property-editor';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UMB_CODE_EDITOR_MODAL } from '@umbraco-cms/backoffice/code-editor';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';

/**
 * @element umb-property-editor-ui-tiny-mce-config-editor
 */
@customElement('umb-property-editor-ui-tiny-mce-config-editor')
export class UmbPropertyEditorUITinyMceConfigEditorElement extends UmbLitElement implements UmbPropertyEditorUiElement {

	@property({ attribute: false })
	set value(value: JSON | null) {
		if (!value) return;

		this._customConfig = value;
	}
	get value(): JSON {
		return this._customConfig;
	}

	@property({ attribute: false })
	config?: UmbPropertyEditorConfigCollection;

	@state()
	private _customConfig: JSON = JSON.parse('{}');

	protected override async firstUpdated(_changedProperties: PropertyValueMap<unknown>) {
		super.firstUpdated(_changedProperties);

		this._customConfig = this.value;

		this.requestUpdate('_customConfig');
	}


	async #showCodeEditor() {
		const value = await umbOpenModal(this, UMB_CODE_EDITOR_MODAL, {
			data: {
				headline: 'Edit custom configuration',
				content: JSON.stringify(this._customConfig) ?? '',
				language: 'json',
			},
		}).catch(() => undefined);

		if (!value) {
			return;
		}

		if (!value.content) {
			this._customConfig = JSON.parse('{}');
		} else {
			try {
				this._customConfig = JSON.parse(value.content.toString());
				console.log('Parsed object:', this._customConfig);
				// Proceed with using jsonObj
			} catch (err) {
				console.error('Invalid JSON:', err);
			}
		}

		this.dispatchEvent(new UmbChangeEvent());
	}

	override render() {
		return html`
			<umb-body-layout>
				<button @click=${this.#showCodeEditor}>Open Code Editor</button>
				<div id="editor-box"><pre>${JSON.stringify(this.value, null, 2)}</pre></div>
			</umb-body-layout>
		`;
	}

	static override readonly styles = [
		css`
			#editor-box {
				padding: var(--uui-box-default-padding, var(--uui-size-space-5, 18px));
				height: 100%;
				display: flex;
				background: #FFFFFF;
				padding: 1em;
				border-radius: 4px;
				font-family: monospace;
			}
		`,
	];
}

export default UmbPropertyEditorUITinyMceConfigEditorElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-tiny-mce-config-editor': UmbPropertyEditorUITinyMceConfigEditorElement;
	}
}
