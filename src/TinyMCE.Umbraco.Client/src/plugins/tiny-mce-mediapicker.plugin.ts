import { sizeImageInEditor, uploadBlobImages } from '@tiny-mce-umbraco/backoffice/core';
import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';
import { getGuidFromUdi, splitStringToArray } from '@umbraco-cms/backoffice/utils';
import { UmbId } from '@umbraco-cms/backoffice/id';
import { UmbLocalizationController } from '@umbraco-cms/backoffice/localization-api';
import { UmbTemporaryFileRepository } from '@umbraco-cms/backoffice/temporary-file';
import { UMB_MEDIA_PICKER_MODAL, UMB_MEDIA_CAPTION_ALT_TEXT_MODAL } from '@umbraco-cms/backoffice/media';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import type { RawEditorOptions } from '@umbraco-cms/backoffice/external/tinymce';

interface MediaPickerTargetData {
	altText?: string;
	url?: string;
	caption?: string;
	udi?: string;
	id?: string;
	tmpimg?: string;
	width?: number;
	height?: number;
}

interface MediaPickerResultData {
	id?: string;
	src?: string;
	alt?: string;
	'data-udi'?: string;
	'data-caption'?: string;
	width?: string;
	height?: string;
}

/** What the caret currently sits in, resolved once and shared by the edit and insert paths. */
interface ExistingMedia {
	/** The node the caret is actually in, before any walking up. */
	selectedNode: Element;
	figure: HTMLElement | null;
	image: HTMLImageElement | null;
	anchor: HTMLAnchorElement | null;
	/** Live caption text, read from the `<figcaption>` in preference to the stale `data-caption`. */
	caption?: string;
}

export default class UmbTinyMceMediaPickerPlugin extends UmbTinyMcePluginBase {
	#modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
	readonly #temporaryFileRepository;

	get #allowedMediaTypeIds(): Array<string> {
		return splitStringToArray(this.configuration?.getValueByAlias<string>('allowedMediaTypes'));
	}

	constructor(args: TinyMcePluginArguments) {
		super(args);
		const localize = new UmbLocalizationController(args.host);

		this.#temporaryFileRepository = new UmbTemporaryFileRepository(args.host);

		this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (instance) => {
			this.#modalManager = instance;
		});

		this.editor.ui.registry.addToggleButton('umbmediapicker', {
			icon: 'image',
			tooltip: localize.term('general_mediaPicker'),
			onAction: () => this.#onAction(),
			onSetup: (api) => {
				// Drive the active state from the SAME resolution the action uses. A selector of
				// `img[data-udi]` only lights up when the image itself is selected, so with the caret in
				// the figcaption the button looked like "nothing selected" while the action would happily
				// have edited that image. Button state and action behaviour must agree.
				const syncActiveState = () => api.setActive(!!this.#resolveExistingMedia().image);

				this.editor.on('NodeChange', syncActiveState);
				syncActiveState();

				return () => this.editor.off('NodeChange', syncActiveState);
			},
		});

		// Register global options for the editor
		this.editor.options.register('maxImageSize', { processor: 'number', default: 500 });

		// Adjust Editor settings to allow pasting images
		// but only if the umbmediapicker button is present
		const toolbar = this.configuration?.getValueByAlias<string[]>('toolbar');
		if (toolbar?.includes('umbmediapicker')) {
			this.editor.options.set('paste_data_images', true);
			this.editor.options.set('automatic_uploads', false);
			this.editor.options.set('images_upload_handler', this.#uploadImageHandler);
			// This allows images to be pasted in & stored as Base64 until they get uploaded to server
			this.editor.options.set('images_replace_blob_uris', true);

			// Listen for SetContent to update images
			this.editor.on('SetContent', async (e) => {
				const content = e.content;

				// Handle images that are pasted in
				uploadBlobImages(this.editor, content);
			});
		}
	}

	/*
	async #observeCurrentUser() {
		if (!this.#currentUserContext) return;

		this.observe(this.#currentUserContext.currentUser, (currentUser) => (this.#currentUser = currentUser));
	}
	*/

	/**
	 * Resolves the media the caret is currently in, walking UP from the selection.
	 *
	 * Both the edit path (`#onAction`) and the insert path (`#insertInEditor`) must agree on what
	 * "the current image" is, or they disagree about whether this is an edit or a fresh insert. The
	 * caret may be on the image, on an `<a>` wrapping it, or inside the `<figcaption>` — all three
	 * have to resolve to the same figure and image.
	 * @returns {ExistingMedia} The figure, image and anchor at the caret, plus the live caption text.
	 */
	#resolveExistingMedia(): ExistingMedia {
		const dom = this.editor.dom;
		const selectedNode = this.editor.selection.getNode();

		const figure = dom.getParent<HTMLElement>(selectedNode, 'figure');
		const image =
			selectedNode.nodeName === 'IMG'
				? (selectedNode as HTMLImageElement)
				: (figure?.querySelector('img') ?? null);
		const anchor = image ? dom.getParent<HTMLAnchorElement>(image, 'a') : null;

		// The `<figcaption>` is what the editor actually sees and edits, so it wins over the
		// `data-caption` attribute, which is only written when the picker last ran and goes stale as
		// soon as someone edits the caption directly in the editor.
		const figcaptionText = figure?.querySelector('figcaption')?.textContent?.trim();
		const caption = figcaptionText || image?.dataset.caption || undefined;

		return { selectedNode, figure, image, anchor, caption };
	}

	async #onAction() {
		const { image, caption } = this.#resolveExistingMedia();
		let currentTarget: MediaPickerTargetData = {};

		if (image) {
			currentTarget = {
				altText: image.alt,
				url: image.src,
				caption,
				// Carry the current dimensions in so the dialog opens showing the real size rather
				// than defaulting, and so an unchanged dialog round-trips the size unchanged.
				width: this.#parseDimension(image.getAttribute('width')),
				height: this.#parseDimension(image.getAttribute('height')),
			};

			if (image.hasAttribute('data-udi')) {
				currentTarget['udi'] = image.dataset.udi;
			} else {
				currentTarget['id'] = image.getAttribute('rel') ?? undefined;
			}

			if (image.hasAttribute('data-tmpimg')) {
				currentTarget['tmpimg'] = image.dataset.tmpimg;
			}
		}

		this.#showMediaPicker(currentTarget);
	}

	#parseDimension(value: string | null): number | undefined {
		if (!value) return undefined;
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
	}

	async #showMediaPicker(currentTarget: MediaPickerTargetData) {
		/*
		let startNodeId;
		let startNodeIsVirtual;

		if (!this.configuration?.getByAlias('startNodeId')) {
			if (this.configuration?.getValueByAlias<boolean>('ignoreUserStartNodes') === true) {
				startNodeId = -1;
				startNodeIsVirtual = true;
			} else {
				startNodeId = this.#currentUser?.mediaStartNodeIds?.length !== 1 ? -1 : this.#currentUser?.mediaStartNodeIds[0];
				startNodeIsVirtual = this.#currentUser?.mediaStartNodeIds?.length !== 1;
			}
		}
		*/

		const allowedIds = this.#allowedMediaTypeIds;
		const modalHandler = this.#modalManager?.open(this, UMB_MEDIA_PICKER_MODAL, {
			data: {
				multiple: false,
				//startNodeIsVirtual,
				pickableFilter: allowedIds.length ? (item) => allowedIds.includes(item.mediaType.unique) : undefined,
			},
			value: {
				selection: currentTarget.udi ? [getGuidFromUdi(currentTarget.udi)] : [],
			},
		});

		if (!modalHandler) return;

		const { selection } = await modalHandler.onSubmit().catch(() => ({ selection: undefined }));
		if (!selection?.length) return;

		this.#showMediaCaptionAltText(selection[0], currentTarget);
		this.editor.dispatch('Change');
	}

	async #showMediaCaptionAltText(mediaUnique: string | null, currentTarget: MediaPickerTargetData) {
		if (!mediaUnique) return;

		const modalHandler = this.#modalManager?.open(this, UMB_MEDIA_CAPTION_ALT_TEXT_MODAL, {
			// The dialog needs maxImageSize to offer sensible sizes; without it the size it hands back
			// is unconstrained and we have no idea what the editor's limit was meant to be.
			data: { mediaUnique, maxImageSize: this.editor.options.get('maxImageSize') },
			value: {
				url: '',
				altText: currentTarget.altText,
				caption: currentTarget.caption,
				width: currentTarget.width,
				height: currentTarget.height,
			},
			// The token defaults this sidebar to `small`, which is too narrow for the width/height row —
			// the unit suffix on the height field gets clipped. Umbraco's own tiptap RTE overrides it the
			// same way for the same reason ("Override default sidebar size for better UX").
			modal: { size: 'medium' },
		});

		const mediaData = await modalHandler?.onSubmit().catch(() => null);
		if (!mediaData) return;

		const media: MediaPickerTargetData = {
			altText: mediaData?.altText,
			caption: mediaData?.caption,
			url: mediaData?.url,
			udi: 'umb://media/' + mediaUnique?.replace(/-/g, ''),
			// The dialog is the authority on size once the editor has chosen one.
			width: mediaData?.width,
			height: mediaData?.height,
		};

		this.#insertInEditor(media);
	}

	async #insertInEditor(media: MediaPickerTargetData) {
		if (!media) return;

		// We need to create a NEW DOM <img> element to insert
		// setting an attribute of ID to __mcenew, so we can gather a reference to the node, to be able to update its size accordingly to the size of the image.
		// An explicit size from the dialog is authoritative. Stamping it on the markup up front means
		// the editor never briefly renders at the wrong size, and it tells the post-insert sizing step
		// below to leave the dimensions alone.
		const explicitSize =
			media.width && media.height ? { width: media.width, height: media.height } : undefined;

		const img: MediaPickerResultData = {
			alt: media.altText,
			src: media.url ? media.url : 'nothing.jpg',
			id: '__mcenew',
			'data-udi': media.udi,
			'data-caption': media.caption,
			...(explicitSize
				? { width: String(explicitSize.width), height: String(explicitSize.height) }
				: {}),
		};
		const dom = this.editor.dom;

		// Same resolution the edit path used, so both agree on what is being replaced. The caret may
		// be on the image, on an <a> wrapping it, or inside the figcaption.
		//
		// The anchor matters because Umbraco fixed this same class of bug in its own RTE in 17.6
		// (media-picker.tiptap-toolbar.utils.ts); re-picking used to silently drop the <a>.
		const {
			selectedNode,
			figure: existingFigure,
			image: existingImage,
			anchor: existingAnchor,
		} = this.#resolveExistingMedia();

		let markup = dom.createHTML('img', img as Record<string, string | null>);

		if (existingAnchor) {
			// Rebuild the wrapping link. `data-mce-*` attributes are TinyMCE's own bookkeeping and are
			// skipped so they get regenerated rather than staling.
			//
			// Because the new markup now CONTAINS the link, whatever we replace below must be the
			// element the old link lived in — never the image inside it. Replacing just the image would
			// nest an <a> inside an <a>; the parser rejects that and splits it, leaving an empty
			// duplicate link behind.
			const anchorAttrs: Record<string, string | null> = {};
			for (const attr of Array.from(existingAnchor.attributes)) {
				if (!attr.name.startsWith('data-mce-')) {
					anchorAttrs[attr.name] = attr.value;
				}
			}
			markup = dom.createHTML('a', anchorAttrs, markup);
		}

		const caption = img['data-caption'];

		if (caption && existingFigure) {
			// Replace only the figure's children, so the figure's own attributes survive along with
			// every sibling elsewhere in the container.
			existingFigure.innerHTML = markup + dom.createHTML('figcaption', {}, caption);
		} else {
			const content = caption ? dom.createHTML('figure', {}, markup + dom.createHTML('figcaption', {}, caption)) : markup;

			// Replace the OUTERMOST element whose markup we have just rebuilt: the figure if there was
			// one, otherwise the link, otherwise the image. Anything narrower would leave a fragment of
			// the old structure behind; anything wider would take out unrelated siblings — the bug in
			// the previous implementation, which assigned to `figure.parentElement.innerHTML`.
			let replaceTarget: HTMLElement | null = existingFigure ?? existingAnchor ?? existingImage;

			if (caption && !existingFigure) {
				// A <figure> is block-level and cannot legally sit inside a <p>. Replacing something
				// *within* the paragraph makes the parser split it, leaving an empty <p> either side of
				// the figure. So when the paragraph holds nothing but this image, promote the target to
				// the paragraph and consume it.
				//
				// Guarded on the paragraph having no text of its own and at most one image, so a figure
				// never swallows a paragraph that has other content in it. `length <= 1` rather than
				// `=== 1` because a brand new insert at a caret has no image in the paragraph yet.
				const paragraph = dom.getParent<HTMLElement>(replaceTarget ?? selectedNode, 'p');
				if (paragraph && !paragraph.textContent?.trim() && paragraph.querySelectorAll('img').length <= 1) {
					replaceTarget = paragraph;
				}
			}

			if (replaceTarget) {
				dom.setOuterHTML(replaceTarget, content);
			} else {
				// Nothing existing to replace: a brand new insert at the caret.
				this.editor.selection.setContent(content);
			}
		}

		// Using settimeout to wait for a DoM-render, so we can find the new element by ID.
		setTimeout(() => {
			const imgElm = this.editor.dom.get('__mcenew') as HTMLImageElement;
			if (!imgElm) return;

			this.editor.dom.setAttrib(imgElm, 'id', null);

			// When image is loaded we are ready to call sizeImageInEditor.
			//
			// `sizeImageInEditor` reads the image's natural size and scales it down to maxImageSize,
			// overwriting the width/height attributes. That is right for pasted or dragged images, but
			// it used to silently discard whatever size the editor chose in the dialog. Passing the
			// explicit size keeps it — the sizer then only refreshes the processed image URL.
			const onImageLoaded = () => {
				sizeImageInEditor(this.editor, imgElm, img.src, explicitSize);
				this.editor.dispatch('Change');
			};

			// Check if image already is loaded.
			if (imgElm.complete === true) {
				onImageLoaded();
			} else {
				imgElm.onload = onImageLoaded;
			}
		});
	}

	readonly #uploadImageHandler: RawEditorOptions['images_upload_handler'] = (blobInfo, progress) => {
		return new Promise((resolve, reject) => {
			progress(0);

			const id = UmbId.new();
			const fileBlob = blobInfo.blob();
			const file = new File([fileBlob], blobInfo.filename(), { type: fileBlob.type });

			document.dispatchEvent(new CustomEvent('rte.file.uploading', { composed: true, bubbles: true }));

			this.#temporaryFileRepository
				.upload(id, file, (evt) => {
					progress((evt.loaded / evt.total) * 100);
				})
				.then((response) => {
					if (response.error) {
						reject(response.error);
						return;
					}

					// Put temp location into localstorage (used to update the img with data-tmpimg later on)
					const blobUri = window.URL.createObjectURL(fileBlob);
					sessionStorage.setItem(`tinymce__${blobUri}`, id);
					resolve(blobUri);
				})
				.catch(reject)
				.finally(() => {
					progress(100);
					document.dispatchEvent(new CustomEvent('rte.file.uploaded', { composed: true, bubbles: true }));
				});
		});
	};
}
