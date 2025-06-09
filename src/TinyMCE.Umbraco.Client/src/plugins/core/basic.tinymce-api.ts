import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';

export default class TinyMceBasicExtensionApi extends UmbTinyMcePluginBase {
	constructor(args: TinyMcePluginArguments) {
		super(args);
		//console.log("basic initialized");
	}
}
