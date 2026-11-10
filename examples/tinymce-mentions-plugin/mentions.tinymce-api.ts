import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';
import type { Editor } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { createMentionsRequest } from './metions-request-factory';

export default class TinyMceMentionsExtensionApi extends UmbTinyMcePluginBase {
	readonly #editor: Editor;
	readonly #configuration: UmbPropertyEditorConfigCollection | undefined;

	constructor(args: TinyMcePluginArguments) {
		super(args);
		console.log("mentions-assitant initialized");

		this.#editor = args.editor;
		this.#configuration = args.host.configuration;

		if (this.#editor) {
			console.log("mentions-assitant this.#editor", [this.#editor]);
		}
		if (this.#configuration) {
			console.log("mentions-assitant this.#configuration", [this.#configuration]);
		}
	}

	static override async extendEditorConfig(_config: any): Promise<void> {
		console.log("mentions-assitant extendEditorConfig 1", [_config]);
		_config.mentions_fetch = await createMentionsRequest(); // or a function that returns the request handler
		console.log("mentions-assitant extendEditorConfig 2", [_config]);
	}

	override async init(): Promise<void> {
		console.log("mentions-assitant init 1");
		//console.log("mentions-assitant init 2");
	}
}
