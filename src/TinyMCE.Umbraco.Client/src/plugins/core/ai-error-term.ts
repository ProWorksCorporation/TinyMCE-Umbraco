/** What the editor knows about a failed AI relay request. */
export interface AiErrorInfo {
	/** The HTTP status, or `undefined` when the request never got a response (a network failure). */
	status?: number;
	/** The `category` of a `502 ai-provider-error` ProblemDetails. */
	category?: string;
}

/** The relay's `502` categories (data-model §3) and their localization keys. */
const categoryKeys: Readonly<Record<string, string>> = {
	authentication: 'tinyMce_aiError_authentication',
	'rate-limited': 'tinyMce_aiError_rateLimited',
	'quota-exceeded': 'tinyMce_aiError_quotaExceeded',
	'invalid-request': 'tinyMce_aiError_invalidRequest',
	unavailable: 'tinyMce_aiError_unavailable',
	timeout: 'tinyMce_aiError_timeout',
	unknown: 'tinyMce_aiError_unknown',
};

/**
 * Chooses the localization key for a failed AI relay request (contracts/ai-completion.md, "Frontend mapping").
 * Pure, and internal to the AI plugin; not re-exported from the package.
 * @param {AiErrorInfo} error - the status and, for a 502, the category.
 * @returns {string} a key in the `tinyMce` localization section.
 */
export function aiErrorTermKey({ status, category }: AiErrorInfo): string {
	if (status === undefined) return 'tinyMce_aiError_unavailable';
	if (status === 503) return 'tinyMce_aiNotConfigured';
	if (status === 400) return 'tinyMce_aiError_invalidRequest';
	if (status === 502 && category && Object.prototype.hasOwnProperty.call(categoryKeys, category)) {
		return categoryKeys[category];
	}
	return 'tinyMce_aiError_unknown';
}
