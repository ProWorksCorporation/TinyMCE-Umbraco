import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UmbLocalizationController } from '@umbraco-cms/backoffice/localization-api';
import { UMB_EMBEDDED_MEDIA_MODAL } from '@umbraco-cms/backoffice/embedded-media';
import type { UmbEmbeddedMediaModalData, UmbEmbeddedMediaModalValue } from '@umbraco-cms/backoffice/embedded-media';

export default class UmbTinyMceEmbeddedMediaPlugin extends UmbTinyMcePluginBase {
	#modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

	constructor(args: TinyMcePluginArguments) {
		super(args);
		const localize = new UmbLocalizationController(args.host);

		this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (instance) => {
			this.#modalManager = instance;
		});

		this.editor.ui.registry.addToggleButton('umbembeddialog', {
			icon: 'embed',
			tooltip: localize.term('general_embed'),
			onAction: () => this.#onAction(),
			onSetup: function (api) {
				const changed = args.editor.selection.selectorChangedWithUnbind('div.umb-embed-holder', (state) =>
					api.setActive(state)
				);
				return () => changed.unbind();
			},
		});
	}

	#onAction() {
		const selectedElm = this.editor.selection.getNode();

		let modify: UmbEmbeddedMediaModalData = {
			width: 360,
			height: 240,
			constrain: true
		};

		if (selectedElm.nodeName.toUpperCase() === 'DIV' && selectedElm.classList.contains('umb-embed-holder')) {
			const url = this.editor.dom.getAttrib(selectedElm, 'data-embed-url');
			const embedWidth = this.editor.dom.getAttrib(selectedElm, 'data-embed-width');
			const embedHeight = this.editor.dom.getAttrib(selectedElm, 'data-embed-height');
			const constrain = this.editor.dom.getAttrib(selectedElm, 'data-embed-constrain') === 'true';

			modify = {
				url,
				constrain,
				width: parseInt(embedWidth) || modify.width,
				height: parseInt(embedHeight) || modify.height,
			};
		}

		this.#showModal(selectedElm, modify);
	}

	#insertInEditor(embed: UmbEmbeddedMediaModalValue, activeElement: HTMLElement) {
		const attrs: Record<string, string> = {
			class: 'mceNonEditable umb-embed-holder',
			'data-embed-url': embed.url ?? '',
			'data-embed-height': String(embed.height ?? 240),
			'data-embed-width': String(embed.width ?? 360),
			'data-embed-constrain': String(embed.constrain ?? false),
			contenteditable: 'false',
		};
		const html = this.editor.dom.createHTML('div', attrs, embed.markup);

		if (activeElement?.nodeName.toUpperCase() === 'DIV' && activeElement.classList.contains('umb-embed-holder')) {
			this.editor.selection.select(activeElement);
		}

		this.editor.selection.setContent(html);
	}

	async #showModal(selectedElm: HTMLElement, embeddedMediaModalData: UmbEmbeddedMediaModalData) {
		const bookmark = this.editor.selection.getBookmark(2, true);

		const modalHandler = this.#modalManager?.open(this, UMB_EMBEDDED_MEDIA_MODAL, {
			data: embeddedMediaModalData,
		});

		if (!modalHandler) return;

		const result = await modalHandler.onSubmit().catch(() => undefined);
		if (!result) return;

		this.editor.focus();
		this.editor.selection.moveToBookmark(bookmark);
		this.#insertInEditor(result, selectedElm);
		this.editor.dispatch('Change');
	}
}
