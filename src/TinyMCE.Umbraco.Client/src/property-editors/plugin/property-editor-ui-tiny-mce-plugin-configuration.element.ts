import { css, customElement, html, property, state, repeat } from '@umbraco-cms/backoffice/external/lit';
import { firstValueFrom } from '@umbraco-cms/backoffice/external/rxjs';
import { TinyMceService } from '../../api/index.js';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';

//import { tinymce } from '@umbraco-cms/backoffice/external/tinymce';
import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import type { PropertyValueMap } from '@umbraco-cms/backoffice/external/lit';
import type {
	UmbPropertyEditorUiElement,
	UmbPropertyEditorConfigCollection,
} from '@umbraco-cms/backoffice/property-editor';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { defaultFallbackConfig } from '@tiny-mce-umbraco/backoffice/core';
import { defaultPremiumPluginsList } from '@tiny-mce-umbraco/backoffice/core';

//const tinyIconSet = tinymce.IconManager.get('default');

type PluginConfig = {
	alias: string;
	label: string;
	icon?: string;
	selected: boolean;
	disabled: boolean;
};

/**
 * @element umb-property-editor-ui-tiny-mce-plugin-configuration
 */
@customElement('umb-property-editor-ui-tiny-mce-plugin-configuration')
export class UmbPropertyEditorUITinyMcePluginConfigurationElement
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

		this._pluginConfig.forEach((v) => {
			v.selected = this.#selectedValues.includes(v.alias);
		});
	}
	get value(): string[] {
		return this.#selectedValues;
	}

	@property({ attribute: false })
	config?: UmbPropertyEditorConfigCollection;

	@state()
	private _pluginConfig: PluginConfig[] = [];

	#selectedValues: string[] = [];

	protected override async firstUpdated(_changedProperties: PropertyValueMap<unknown>) {
		super.firstUpdated(_changedProperties);

		this.config?.getValueByAlias<PluginConfig[]>('plugins')?.forEach((v) => {
			this._pluginConfig.push({
				...v,
				selected: this.value.includes(v.alias),
			});
		});

		await this.getPlugins();

		this.requestUpdate('_pluginConfig');
	}

	async #getTinyMceConfig() {
		// @ts-ignore
		const { data } = await tryExecute(this, TinyMceService.getConfig({ client: umbHttpClient }));
		if (!data) return;

		return data;
	}

	private async getPlugins(): Promise<void> {
		// Get all the tinymce plugins
		const plugin$ = umbExtensionsRegistry.byType('tinyMcePlugin');

		const plugins = await firstValueFrom(plugin$);

		const appSettingsConfig = await this.#getTinyMceConfig();
		// Get list of plugins to exclude from the list
		let apiKey = '';
		let excludeList: string[] = [];
		let configPlugins: string[] = [];
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

			if (Array.isArray(appSettingsConfig.richTextEditor?.plugins)) {
				configPlugins = appSettingsConfig.richTextEditor?.plugins;
			}
		}

		// Add defaultPlugins
		if (typeof defaultFallbackConfig.plugins === 'string') {
			this._pluginConfig.push({
				alias: defaultFallbackConfig.plugins,
				label: defaultFallbackConfig.plugins + ' (default plugin)',
				icon: undefined,
				selected: true,
				disabled: true,
			});
		} else if (Array.isArray(defaultFallbackConfig.plugins)) {
			defaultFallbackConfig.plugins.forEach((pl: any) => {
				this._pluginConfig.push({
					alias: pl,
					label: pl + ' (default plugin)',
					selected: true,
					disabled: true,
				});
			});
		}

		const defaultPluginAliases = this._pluginConfig.map((p) => p.alias);

		configPlugins.forEach((p) => {
			if (!excludeList.includes(p) && !defaultPluginAliases.includes(p)) {
				this._pluginConfig.push({
					alias: p,
					label: p,
					icon: undefined,
					selected: this.value.includes(p),
					disabled: false,
				});
			}
		});

		plugins.forEach((p) => {
			if (p.meta?.plugins) {
				if (typeof p.meta.plugins === 'string' && !excludeList.includes(p.meta.plugins)) {
					this._pluginConfig.push({
						alias: p.meta.plugins,
						label: p.meta.plugins,
						icon: undefined,
						selected: this.value.includes(p.meta.plugins),
						disabled: false,
					});
				} else if (Array.isArray(p.meta.plugins)) {
					p.meta.plugins.forEach((pl: any) => {
						if (!excludeList.includes(pl)) {
							this._pluginConfig.push({
								alias: pl,
								label: pl,
								icon: undefined,
								selected: this.value.includes(pl),
								disabled: false,
							});
						}
					});
				}
			}
		});
	}

	private onChange(event: CustomEvent) {
		const checkbox = event.target as HTMLInputElement;
		const alias = checkbox.value;

		const value = this._pluginConfig
			.filter((t) => (t.alias !== alias && t.selected) || (t.alias === alias && checkbox.checked))
			.map((v) => v.alias);

		this.value = value;

		this.dispatchEvent(new UmbChangeEvent());
	}

	override render() {
		return html`<ul>
			${repeat(
				this._pluginConfig,
				(v) => v.alias,
				(v) =>
					html`<li>
						<uui-checkbox
							label=${v.label}
							value=${v.alias}
							?disabled=${v.disabled}
							?checked=${v.selected}
							@change=${this.onChange}>
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
			}
		`,
	];
}

export default UmbPropertyEditorUITinyMcePluginConfigurationElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-tiny-mce-plugin-configuration': UmbPropertyEditorUITinyMcePluginConfigurationElement;
	}
}
