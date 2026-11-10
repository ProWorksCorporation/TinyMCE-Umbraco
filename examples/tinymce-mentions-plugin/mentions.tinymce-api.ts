import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';
import { createMentionsRequest } from './mentions-request-factory';

export default class TinyMceMentionsExtensionApi extends UmbTinyMcePluginBase {
	constructor(args: TinyMcePluginArguments) {
		super(args);
		// `args.editor` is the TinyMCE editor this plugin instance belongs to, e.g. to register a toolbar button with
		// `args.editor.ui.registry.addButton(...)`. The mentions plugin needs nothing per editor, only the
		// configuration below.
	}

	// Runs before each editor initialises: hands TinyMCE's premium `mentions` plugin its fetch handler.
	static override async extendEditorConfig(config: Record<string, unknown>): Promise<void> {
		config.mentions_fetch = createMentionsRequest();
	}
}
