import { UmbTinyMcePluginBase } from '@tiny-mce-umbraco/backoffice/core';
import type { TinyMcePluginArguments } from '@tiny-mce-umbraco/backoffice/core';

export default class TinyMceA11ycheckerExtensionApi extends UmbTinyMcePluginBase {
	constructor(args: TinyMcePluginArguments) {
		super(args);
		//console.log("allychecker initialized");
	}
}
