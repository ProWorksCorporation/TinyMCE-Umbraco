import type { UmbInputTinyMceElement } from '@tiny-mce-umbraco/backoffice/core';
import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbApi } from '@umbraco-cms/backoffice/extension-api';
import type { Editor } from '@umbraco-cms/backoffice/external/tinymce';
import type { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import type { ClassConstructor } from '@umbraco-cms/backoffice/extension-api';

export class UmbTinyMcePluginBase extends UmbControllerBase implements UmbApi, TinyMcePluginInterface {
	editor: Editor;
	configuration?: UmbPropertyEditorConfigCollection;

	constructor(arg: TinyMcePluginArguments) {
		super(arg.host);
		this.editor = arg.editor;
		this.configuration = arg.host.configuration;
	}

	// Called before the editor is created
	static async extendEditorConfig(_config: any): Promise<void> {
		// No-op by default
	}

	// Default (empty) implementation so subclasses can override it
	async init(): Promise<void> {
		// No-op by default
	}
}

export type TinyMcePluginArguments = {
	host: UmbInputTinyMceElement;
	editor: Editor;
};
export interface TinyMcePluginInterface {
	init(): Promise<void>;
}
export interface UmbTinyMcePluginClass extends ClassConstructor<UmbTinyMcePluginBase> {
	extendEditorConfig?: (_config: any) => Promise<void>;
}
