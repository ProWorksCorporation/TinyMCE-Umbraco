import type { UmbLocalizationDictionary } from '@umbraco-cms/backoffice/localization-api';

export default {
	blockEditor: {
		confirmDeleteBlockTitle: 'Delete %0%?',
		confirmDeleteBlockMessage: 'Are you sure you want to delete this %0%?',
	},
	create: {
		newRteStyleSheetFile: 'New Rich Text Editor Stylesheet',
	},
	// Messages for the AI assistant's server relay (CL-001). Other languages fall back to these (research R5).
	tinyMce: {
		aiNotConfigured: "The AI assistant isn't configured on this site. Ask an administrator to add an AI provider key.",
		aiError_authentication:
			"The AI provider rejected the site's credentials. Ask an administrator to check the AI provider key.",
		aiError_rateLimited: 'The AI provider is busy. Wait a moment and try again.',
		aiError_quotaExceeded:
			"The site's AI provider quota has been used up. Ask an administrator to check the AI provider account.",
		aiError_invalidRequest: "The AI provider couldn't process this request. Try a shorter or simpler prompt.",
		aiError_unavailable: "The AI provider couldn't be reached. Try again later.",
		aiError_timeout: 'The AI provider took too long to respond. Try again.',
		aiError_unknown: 'The AI request failed. Try again, or ask an administrator to check the server log.',
	},
} as UmbLocalizationDictionary;
