import { availableLanguages } from '@tiny-mce-umbraco/backoffice/core';
import { defaultFallbackConfig, defaultPremiumPluginsList } from '@tiny-mce-umbraco/backoffice/core';
import { pastePreProcessHandler } from '@tiny-mce-umbraco/backoffice/core';
import { uriAttributeSanitizer } from '@tiny-mce-umbraco/backoffice/core';
import { UmbStylesheetRuleManager } from '@tiny-mce-umbraco/backoffice/core';
import type { UmbTinyMcePluginClass } from '@tiny-mce-umbraco/backoffice/core';
import { css, customElement, html, property, query } from '@umbraco-cms/backoffice/external/lit';
import { loadManifestApi } from '@umbraco-cms/backoffice/extension-api';
import { getProcessedImageUrl, umbDeepMerge } from '@umbraco-cms/backoffice/utils';
import { renderEditor } from '@umbraco-cms/backoffice/external/tinymce';
import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import { ImageCropModeModel } from '@umbraco-cms/backoffice/external/backend-api';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbStylesheetDetailRepository } from '@umbraco-cms/backoffice/stylesheet';
import { UUIFormControlMixin } from '@umbraco-cms/backoffice/external/uui';
//import type { ClassConstructor } from '@umbraco-cms/backoffice/extension-api';
import type { EditorEvent, Editor, RawEditorOptions } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { ManifestTinyMcePlugin } from '@tiny-mce-umbraco/backoffice/core';
import type { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';

import { TinyMceService } from '../../api/index.js';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
// @ts-ignore
import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';

/**
 * Handles the resize event
 * @param e
 */
async function onResize(
	e: EditorEvent<{
		target: HTMLElement;
		width: number;
		height: number;
		origin: string;
	}>
) {
	const srcAttr = e.target.getAttribute('src');

	if (!srcAttr) {
		return;
	}

	const path = srcAttr.split('?')[0];
	const resizedPath = await getProcessedImageUrl(path, {
		width: e.width,
		height: e.height,
		mode: ImageCropModeModel.MAX,
	});

	e.target.setAttribute('data-mce-src', resizedPath);
}

function mergeArrays(arr1: string | string[] | undefined, arr2: string | string[] | undefined): string[] {
	const a1 = Array.isArray(arr1) ? arr1 : arr1 ? [arr1] : [];
	const a2 = Array.isArray(arr2) ? arr2 : arr2 ? [arr2] : [];

	return Array.from(new Set([...a1, ...a2]));
}

@customElement('umb-input-tiny-mce')
export class UmbInputTinyMceElement extends UUIFormControlMixin(UmbLitElement, '') {
	@property({ attribute: false })
	configuration?: UmbPropertyEditorConfigCollection;

	//#plugins: Array<ClassConstructor<UmbTinyMcePluginBase> | undefined> = [];
	#plugins: Array<UmbTinyMcePluginClass | undefined> = [];
	#editorRef?: Editor | null = null;
	readonly #stylesheetRepository = new UmbStylesheetDetailRepository(this);
	readonly #umbStylesheetRuleManager = new UmbStylesheetRuleManager();

	protected override getFormElement() {
		return this._editorElement?.querySelector('iframe') ?? undefined;
	}

	override set value(newValue: FormDataEntryValue | FormData) {
		const newContent = typeof newValue === 'string' ? newValue : '';
		super.value = newContent;

		if (this.#editorRef && this.#editorRef.getContent() != newContent) {
			this.#editorRef.setContent(newContent);
		}
	}

	override get value(): FormDataEntryValue | FormData {
		return super.value;
	}

	/**
	 * Sets the input to readonly mode, meaning value cannot be changed but still able to read and select its content.
	 * @type {boolean}
	 * @attr
	 * @default
	 */
	@property({ type: Boolean, reflect: true })
	public get readonly() {
		return this.#readonly;
	}
	public set readonly(value) {
		this.#readonly = value;
		const editor = this.getEditor();
		const mode = value ? 'readonly' : 'design';
		editor?.mode.set(mode);
	}
	#readonly = false;

	@query('.editor', true)
	private readonly _editorElement?: HTMLElement;

	getEditor() {
		return this.#editorRef;
	}

	override firstUpdated() {
		this.#loadEditor();
	}

	async #loadEditor() {
		this.observe(umbExtensionsRegistry.byType('tinyMcePlugin'), async (manifests) => {
			this.#plugins.length = 0;
			this.#plugins = await this.#loadPlugins(manifests);

			//console.log('#plugins', [this.#plugins, manifests]);

			let config: RawEditorOptions = {};
			manifests.forEach((manifest) => {
				if (manifest.meta?.config) {
					config = umbDeepMerge(manifest.meta.config, config);
				}
			});

			this.#setTinyConfig(config);
		});
	}

	override disconnectedCallback() {
		super.disconnectedCallback();

		this.#editorRef?.destroy();
	}

	/**
	 * Load all custom plugins - need to split loading and instantiating as these
	 * need the editor instance as a ctor argument. If we load them in the editor
	 * setup method, the asynchronous nature means the editor is loaded before
	 * the plugins are ready and so are not associated with the editor.
	 * @param manifests
	 */
	async #loadPlugins(manifests: Array<ManifestTinyMcePlugin>) {
		const promises = [];
		for (const manifest of manifests) {
			if (manifest.js) {
				promises.push(await loadManifestApi(manifest.js));
			}
			if (manifest.api) {
				promises.push(await loadManifestApi(manifest.api));
			}
		}
		return await Promise.all(promises); // await all together;
	}

	async getFormatStyles(stylesheetPaths: Array<string>) {
		if (!stylesheetPaths) return [];
		const formatStyles: any[] = [];

		const promises = stylesheetPaths.map((path) => this.#stylesheetRepository?.requestByUnique(path));
		const stylesheetResponses = await Promise.all(promises);

		stylesheetResponses.forEach(({ data }) => {
			if (!data?.content) return;

			const rulesFromContent = this.#umbStylesheetRuleManager.extractRules(data.content);

			rulesFromContent.forEach((rule) => {
				const r: {
					title?: string;
					inline?: string;
					classes?: string;
					attributes?: Record<string, string>;
					block?: string;
				} = {
					title: rule.name,
				};

				if (!rule.selector) return;

				if (rule.selector.startsWith('.')) {
					r.inline = 'span';
					r.classes = rule.selector.substring(1);
				} else if (rule.selector.startsWith('#')) {
					r.inline = 'span';
					r.attributes = { id: rule.selector.substring(1) };
				} else if (rule.selector.includes('.')) {
					const [block, ...classes] = rule.selector.split('.');
					r.block = block;
					r.classes = classes.join(' ').replace(/\./g, ' ');
				} else if (rule.selector.includes('#')) {
					const [block, id] = rule.selector.split('#');
					r.block = block;
					r.classes = id;
				} else {
					r.block = rule.selector;
				}

				formatStyles.push(r);
			});
		});

		return formatStyles;
	}

	async #getTinyMceConfig() {
		// @ts-ignore
		const { data } = await tryExecute(this, TinyMceService.getConfig({ client: umbHttpClient }));
		if (!data) return;

		return data;
	}

	async #setTinyConfig(additionalConfig?: RawEditorOptions) {
		//console.log('#setTinyConfig start');

		const dimensions = this.configuration?.getValueByAlias<{ width?: number; height?: number }>('dimensions');

		const stylesheetPaths = this.configuration?.getValueByAlias<string[]>('stylesheets') ?? [];
		const styleFormats = await this.getFormatStyles(stylesheetPaths);

		const preValueCustomConfig = this.configuration?.getValueByAlias<JSON>('customConfig') ?? {};

		// Map the stylesheets with server url
		const stylesheets =
			stylesheetPaths?.map((stylesheetPath: string) => `/css${stylesheetPath.replace(/\\/g, '/')}`) ?? [];

		stylesheets.push('/umbraco/backoffice/css/rte-content.css');

		const appSettingsConfig = await this.#getTinyMceConfig();

		let apiKey = 'no-origin';
		let version = '6';
		let url = '';
		let excludeList: string[] = [];
		if (appSettingsConfig) {
			// @ts-ignore
			apiKey = appSettingsConfig.richTextEditor?.cloudApiKey || 'no-origin';
			if (appSettingsConfig.config?.apikey) {
				apiKey = appSettingsConfig.config?.apikey;
			}
			version = appSettingsConfig.config?.tinyMceVersion || '6';
			// @ts-ignore
			if (apiKey && apiKey != 'no-origin') {
				url = appSettingsConfig.config?.tinyMceUrl || `https://cdn.tiny.cloud/1/${apiKey}/tinymce/${version}/`;
			}
			if (Array.isArray(appSettingsConfig.config?.pluginsToExclude)) {
				excludeList = appSettingsConfig.config?.pluginsToExclude;
				if (!apiKey || apiKey == 'no-origin') {
					// Remove pre-loaded premium plugins if no key present
					excludeList = [...new Set([...excludeList, ...defaultPremiumPluginsList])];
				}
			}
		}

		//console.log('#setTinyConfig 1', [appSettingsConfig, this.configuration, additionalConfig]);

		// create an object by merging the configuration onto the fallback config
		const configurationOptions: RawEditorOptions = {
			...defaultFallbackConfig,
			height: dimensions?.height ?? defaultFallbackConfig.height,
			width: dimensions?.width ?? defaultFallbackConfig.width,
			content_css: stylesheets.length ? stylesheets : defaultFallbackConfig.content_css,
			style_formats: styleFormats.length ? styleFormats : defaultFallbackConfig.style_formats,
		};

		// no auto resize when a fixed height is set
		if (!configurationOptions.height) {
			if (Array.isArray(configurationOptions.plugins) && configurationOptions.plugins.includes('autoresize')) {
				configurationOptions.plugins.splice(configurationOptions.plugins.indexOf('autoresize'), 1);
			}
		}

		// set the configured plugins if any, otherwise false
		const plugins = this.configuration?.getValueByAlias<string[]>('plugins');
		if (plugins && plugins.length) {
			if (typeof configurationOptions.plugins === 'string' || Array.isArray(configurationOptions.plugins)) {
				configurationOptions.plugins = plugins.concat(configurationOptions.plugins);
			} else {
				configurationOptions.plugins = plugins;
			}
		}

		// Exclude plugins explicitly excluded by configuration
		if (Array.isArray(configurationOptions.plugins)) {
			configurationOptions.plugins = configurationOptions.plugins.filter((item) => !excludeList.includes(item));
		}

		// set the configured toolbar if any, otherwise false
		const toolbar = this.configuration?.getValueByAlias<string[]>('toolbar');
		if (toolbar?.length) {
			configurationOptions.toolbar = toolbar.join(' ');
		} else {
			configurationOptions.toolbar = false;
		}

		// set the configured inline mode
		const mode = this.configuration?.getValueByAlias<string>('mode');
		if (mode?.toLocaleLowerCase() === 'inline') {
			configurationOptions.inline = true;
		}

		// set the maximum image size
		const maxImageSize = this.configuration?.getValueByAlias<number>('maxImageSize');
		if (maxImageSize) {
			configurationOptions.maxImageSize = maxImageSize;
		}

		//console.log('#setTinyConfig 2', [configurationOptions]);

		// set the default values that will not be modified via configuration
		let config: RawEditorOptions = {
			autoresize_bottom_margin: 10,
			body_class: 'umb-rte',
			contextMenu: false,
			inline_boundaries_selector: 'a[href],code,.mce-annotation,.umb-embed-holder,.umb-macro-holder',
			menubar: false,
			paste_remove_styles_if_webkit: true,
			paste_preprocess: pastePreProcessHandler,
			relative_urls: false,
			resize: false,
			statusbar: false,
			setup: (editor) => this.#editorSetup(editor),
			target: this._editorElement,
			paste_data_images: false,
			language: this.#getLanguage(),
			promotion: false,
			convert_unsafe_embeds: true, // [JOV] Workaround for CVE-2024-29881
			readonly: this.#readonly,

			// Extend with configuration options
			...configurationOptions,
		};

		if (appSettingsConfig && url.length > 0) {
			config.base_url = url;
		}

		// Extend with additional configuration options
		if (additionalConfig) {
			const mergedPlugins = mergeArrays(additionalConfig.plugins, config.plugins);
			config = umbDeepMerge(additionalConfig, config);
			config.plugins = mergedPlugins;
		}

		if (appSettingsConfig) {
			if (appSettingsConfig.richTextEditor) {
				const mergedPlugins = mergeArrays(appSettingsConfig.richTextEditor.plugins, config.plugins);
				config = umbDeepMerge(appSettingsConfig.richTextEditor.customConfig, config);
				config.plugins = mergedPlugins;

				if (appSettingsConfig.richTextEditor.validElements.length > 0) {
					config.valid_elements = appSettingsConfig.richTextEditor.validElements;
				}
				if (appSettingsConfig.richTextEditor.invalidElements.length > 0) {
					config.invalid_elements = appSettingsConfig.richTextEditor.invalidElements;
				}
			}
			if (appSettingsConfig.config) {
				config = umbDeepMerge(appSettingsConfig.config.customConfig, config);
			}
		}

		if (preValueCustomConfig) {
			config = umbDeepMerge(preValueCustomConfig, config);
		}

		// Loop through plugins and call extendEditorConfig if it exists to allow plugins to
		// setup some advanced config like javascript before the editor is initialized.
		const promises = [];
		for (const pluginClass of this.#plugins) {
			if (pluginClass) {
				if (typeof pluginClass.extendEditorConfig === 'function') {
					promises.push(await pluginClass.extendEditorConfig(config));
				}
			}
		}
		await Promise.all(promises); // await all together;

		//console.log('#setTinyConfig before init', [config]);

		this.#editorRef?.destroy();

		const editors = await renderEditor(config).catch((error) => {
			console.error('Failed to render TinyMCE', error);
			return [];
		});
		this.#editorRef = editors.pop();

		//	console.log('#setTinyConfig end');
	}

	/**
	 * Gets the language to use for TinyMCE
	 */
	#getLanguage() {
		const localeId = this.localize.lang();
		//try matching the language using full locale format
		let languageMatch = availableLanguages.find((x) => localeId?.localeCompare(x) === 0);

		//if no matches, try matching using only the language
		if (!languageMatch) {
			const localeParts = localeId?.split('_');
			if (localeParts) {
				languageMatch = availableLanguages.find((x) => x === localeParts[0]);
			}
		}

		return languageMatch;
	}

	async #editorSetup(editor: Editor) {
		//console.log('#editorSetup start');

		editor.suffix = '.min';

		// define keyboard shortcuts
		editor.addShortcut('Ctrl+S', '', () =>
			this.dispatchEvent(new CustomEvent('rte.shortcut.save', { composed: true, bubbles: true }))
		);

		editor.addShortcut('Ctrl+P', '', () =>
			this.dispatchEvent(new CustomEvent('rte.shortcut.saveAndPublish', { composed: true, bubbles: true }))
		);

		// bind editor events
		editor.on('init', () => this.#onInit(editor));
		editor.on('Change', () => this.#onChange(editor.getContent()));
		editor.on('Dirty', () => this.#onChange(editor.getContent()));
		editor.on('Keyup', () => this.#onChange(editor.getContent()));

		editor.on('focus', () => this.dispatchEvent(new CustomEvent('umb-rte-focus', { composed: true, bubbles: true })));

		editor.on('blur', () => {
			this.#onChange(editor.getContent());
			this.dispatchEvent(new CustomEvent('umb-rte-blur', { composed: true, bubbles: true }));
		});

		editor.on('ObjectResized', (e) => {
			onResize(e);
			this.#onChange(editor.getContent());
		});

		editor.on('SetContent', () => {
			/**
			 * Prevent injecting arbitrary JavaScript execution in on-attributes.
			 *
			 */
			const allNodes = Array.from(editor.dom.doc.getElementsByTagName('*'));
			allNodes.forEach((node) => {
				for (const attr of node.attributes) {
					if (attr.name.startsWith('on')) {
						node.removeAttribute(attr.name);
					}
				}
			});
		});

		// instantiate plugins to ensure they are available before setting up the editor.
		// Plugins require a reference to the current editor as a param, so can not
		// be instantiated until we have an editor
		for (const plugin of this.#plugins) {
			if (plugin) {
				// [v15]: This might be improved by changing to `createExtensionApi` and avoiding the `#loadPlugins` method altogether, but that would require a breaking change
				// because that function sends the UmbControllerHost as the first argument, which is not the case here.
				const instance = new plugin({ host: this, editor });
				// [Jason]: Added this to allow for some initialization in the plugins before the TinyMCE editor is initialized
				if (typeof instance.init === 'function') {
					await instance.init(); // await only if async init exists
				}
			}
		}
		//console.log('#editorSetup end');
	}

	#onInit(editor: Editor) {
		//enable browser based spell checking
		editor.getBody().setAttribute('spellcheck', 'true');
		uriAttributeSanitizer(editor);
		editor.setContent(typeof this.value === 'string' ? this.value : '');
	}

	#onChange(value: string) {
		if (this.value === value) return;
		this.value = value;
		this.dispatchEvent(new UmbChangeEvent());
	}

	/**
	 * Nothing rendered by default - TinyMCE initialization creates
	 * a target div and binds the RTE to that element
	 */
	override render() {
		return html`<div class="editor"></div>`;
	}

	static override readonly styles = [
		css`
			.tox-tinymce {
				position: relative;
				min-height: 100px;
				border-radius: 0;
				border: var(--uui-input-border-width, 1px) solid var(--uui-input-border-color, var(--uui-color-border, #d8d7d9));
			}

			.tox-tinymce-fullscreen {
				position: absolute;
			}

			/* FIXME: Remove this workaround when https://github.com/tinymce/tinymce/issues/6431 has been fixed */
			.tox .tox-collection__item-label {
				line-height: 1 !important;
			}
		`,
	];
}

export default UmbInputTinyMceElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-input-tiny-mce': UmbInputTinyMceElement;
	}
}
