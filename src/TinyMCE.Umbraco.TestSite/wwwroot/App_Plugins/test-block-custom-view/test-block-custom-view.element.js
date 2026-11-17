// A custom block view (Umbraco's `blockEditorCustomView` extension type) for testing #206: rich text blocks should
// render with it in TinyMCE as they do in Umbraco's own editor. Plain JavaScript with no build step; the backoffice's
// import map resolves the @umbraco-cms/backoffice imports.
import { css, html, LitElement } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';

export class TestBlockCustomViewElement extends UmbElementMixin(LitElement) {
	static properties = {
		content: { attribute: false },
	};

	render() {
		// testBlock has a Title property, hBlock a Text property.
		const text = this.content?.title ?? this.content?.text ?? '';
		return html`<div class="custom-view">
			<span class="badge">Custom view</span>
			<span class="text">${text}</span>
		</div>`;
	}

	static styles = css`
		:host {
			display: block;
		}
		.custom-view {
			border: 2px dashed #3544b1;
			border-radius: 6px;
			padding: 8px 12px;
			background: #eef0fb;
			font-family: sans-serif;
		}
		.badge {
			font-size: 11px;
			text-transform: uppercase;
			color: #3544b1;
			margin-right: 8px;
		}
	`;
}

if (!customElements.get('test-block-custom-view')) {
	customElements.define('test-block-custom-view', TestBlockCustomViewElement);
}

export { TestBlockCustomViewElement as element };
export default TestBlockCustomViewElement;
