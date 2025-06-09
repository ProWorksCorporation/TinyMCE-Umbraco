import { css, customElement, html, property, state, repeat } from '@umbraco-cms/backoffice/external/lit';
import { firstValueFrom } from '@umbraco-cms/backoffice/external/rxjs';
import { TinyMceService } from '../../api/index.js';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import { tinymce } from '@umbraco-cms/backoffice/external/tinymce';
import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import type { PropertyValueMap } from '@umbraco-cms/backoffice/external/lit';
import type {
	UmbPropertyEditorUiElement,
	UmbPropertyEditorConfigCollection,
} from '@umbraco-cms/backoffice/property-editor';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import { defaultPremiumPluginsList } from '@tiny-mce-umbraco/backoffice/core';

const tinyIconSet = tinymce.IconManager.get('default');

type ToolbarConfig = {
	alias: string;
	label: string;
	icon?: string;
	selected: boolean;
	disabled: boolean;
	isplugin: boolean;
	pluginAlias?: string;
};

/**
 * @element umb-property-editor-ui-tiny-mce-toolbar-configuration
 */
@customElement('umb-property-editor-ui-tiny-mce-toolbar-configuration')
export class UmbPropertyEditorUITinyMceToolbarConfigurationElement
	extends UmbLitElement
	implements UmbPropertyEditorUiElement
{
	@property({ attribute: false })
	set value(value: string | string[] | null) {
		if (!value) return;

		if (typeof value === 'string') {
			this.#selectedValues = value.split(',').filter((x) => x.length > 0);
		} else if (Array.isArray(value)) {
			this.#selectedValues = value;
		} else {
			this.#selectedValues = [];
			return;
		}

		// Migrations
		if (this.#selectedValues.includes('ace')) {
			this.#selectedValues = this.#selectedValues.filter((v) => v !== 'ace');
			this.#selectedValues.push('sourcecode');
		}

		this._toolbarConfig.forEach((v) => {
			v.selected = this.#selectedValues.includes(v.alias);
		});
	}
	get value(): string[] {
		return this.#selectedValues;
	}

	@property({ attribute: false })
	config?: UmbPropertyEditorConfigCollection;

	@state()
	private readonly _toolbarConfig: ToolbarConfig[] = [];

	#selectedValues: string[] = [];

	async #getTinyMceConfig() {
		// @ts-ignore
		const { data } = await tryExecute(this, TinyMceService.getConfig({ client: umbHttpClient }));
		if (!data) return;

		return data;
	}

	protected override async firstUpdated(_changedProperties: PropertyValueMap<unknown>) {
		super.firstUpdated(_changedProperties);

		this.config?.getValueByAlias<ToolbarConfig[]>('toolbar')?.forEach((v) => {
			this._toolbarConfig.push({
				...v,
				selected: this.value.includes(v.alias),
				disabled: false,
				isplugin: false,
				pluginAlias: v.pluginAlias,
			});
		});

		await this.getToolbarPlugins();

		this.requestUpdate('_toolbarConfig');

		this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, async (context) => {
			this.observe(await context?.propertyValueByAlias<Array<string>>('plugins'), (value) => {
				//console.log([value]);
				this._toolbarConfig.forEach((p) => {
					if (p.isplugin && p.pluginAlias) {
						if (value?.includes(p.pluginAlias)) {
							p.disabled = false;
						} else {
							p.disabled = true;
						}
					}
				});
				//console.log([this._toolbarConfig]);

				this.requestUpdate('_toolbarConfig');
			});
		});
	}

	private async getToolbarPlugins(): Promise<void> {
		// Get all the toolbar plugins
		const plugin$ = umbExtensionsRegistry.byType('tinyMcePlugin');

		const plugins = await firstValueFrom(plugin$);

		const appSettingsConfig = await this.#getTinyMceConfig();

		// Get list of plugins to exclude from the list
		let excludeList: string[] = [];
		let apiKey = '';
		if (appSettingsConfig) {
			apiKey = appSettingsConfig.richTextEditor?.cloudApiKey || '';
			if (appSettingsConfig.config?.apikey) {
				apiKey = appSettingsConfig.config?.apikey;
			}

			if (Array.isArray(appSettingsConfig.config?.pluginsToExclude)) {
				excludeList = appSettingsConfig.config?.pluginsToExclude;
			}

			if (!apiKey) {
				// Remove pre-loaded premium plugins if no key present
				excludeList = [...new Set([...excludeList, ...defaultPremiumPluginsList])];
			}
		}

		plugins.forEach((p) => {
			// If the plugin has a toolbar, add it to the config
			if (p.meta?.toolbar) {
				p.meta.toolbar.forEach((t: any) => {
					if (!excludeList.includes(t.pluginAlias)) {
						this._toolbarConfig.push({
							alias: t.alias,
							label: this.localize.string(t.label),
							icon: t.icon ?? 'icon-autofill',
							selected: this.value.includes(t.alias),
							disabled: false,
							isplugin: t.isplugin,
							pluginAlias: t.pluginAlias,
						});
					}
				});
			}
		});
	}

	private onChange(event: CustomEvent) {
		const checkbox = event.target as HTMLInputElement;
		const alias = checkbox.value;

		const value = this._toolbarConfig
			.filter((t) => (t.alias !== alias && t.selected) || (t.alias === alias && checkbox.checked))
			.map((v) => v.alias);

		this.value = value;

		this.dispatchEvent(new UmbChangeEvent());
	}

	override render() {
		return html`<ul>
			${repeat(
				this._toolbarConfig,
				(v) => v.alias,
				(v) =>
					html`<li>
						<uui-checkbox
							label=${v.label}
							value=${v.alias}
							?disabled=${v.disabled}
							?checked=${v.selected}
							@change=${this.onChange}>
							<uui-icon .svg=${tinyIconSet?.icons[v.icon ?? 'alignjustify']}></uui-icon>
							${v.label}
						</uui-checkbox>
					</li>`
			)}
		</ul>`;
	}

	static override readonly styles = [
		UmbTextStyles,
		css`
			ul {
				list-style: none;
				padding: 0;
				margin: 0;

				uui-icon {
					width: 1.5em;
					height: 1.5em;
					margin-right: 5px;
				}
			}
		`,
	];
}

export default UmbPropertyEditorUITinyMceToolbarConfigurationElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-tiny-mce-toolbar-configuration': UmbPropertyEditorUITinyMceToolbarConfigurationElement;
	}
}
