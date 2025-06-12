import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';
import type { Editor } from '@tiny-mce-umbraco/backoffice/external/tinymce';
import type { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { createAiRequest } from './ai-request-factory';

export default class TinyMceAiAssitantExtensionApi extends UmbTinyMcePluginBase {
	readonly #editor: Editor;
	readonly #configuration: UmbPropertyEditorConfigCollection | undefined;

	constructor(args: TinyMcePluginArguments) {
		super(args);
		//console.log("ai-assitant initialized");

		this.#editor = args.editor;
		this.#configuration = args.host.configuration;

		if (this.#editor) {
			//console.log("ai-assitant this.#editor", [this.#editor]);
		}
		if (this.#configuration) {
			//console.log("ai-assitant this.#configuration", [this.#configuration]);
		}
	}

	static override async extendEditorConfig(_config: any): Promise<void> {
		//console.log("ai-assitant extendEditorConfig 1", [_config]);
		_config.ai_request = await createAiRequest(); // or a function that returns the request handler
		//console.log("ai-assitant extendEditorConfig 2", [_config]);
	}

	override async init(): Promise<void> {
		//console.log("ai-assitant init 1");
		//console.log("ai-assitant init 2");
	}
}
