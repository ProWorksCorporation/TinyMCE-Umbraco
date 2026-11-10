import { umbLocalizationManager } from '@umbraco-cms/backoffice/localization-api';

/**
 * Looks up a localized term without a controller host.
 *
 * The AI request handler is created in the static `extendEditorConfig`, which has no element to host an
 * `UmbLocalizationController`, and 17.8's `localization-api` exports no host-free lookup (research R5). This follows
 * the controller's own order against `umbLocalizationManager`: the regional set for the user's language (`da-dk`),
 * then the language set (`da`), then the English fallback, and finally the key itself.
 *
 * Internal to the AI plugin; not re-exported from the package.
 * @param {string} key - the localization key, e.g. `tinyMce_aiError_rateLimited`.
 * @returns {string} the localized text, or `key` when no set has it.
 */
export function aiTerm(key: string): string {
	const lang = `${umbLocalizationManager.documentLanguage || ''}`.toLowerCase();

	let language = lang;
	let region = '';
	try {
		const locale = new Intl.Locale(lang);
		language = locale.language.toLowerCase();
		region = locale.region?.toLowerCase() ?? '';
	} catch {
		// An empty or malformed language falls through to the English fallback.
	}

	const sets = [
		region ? umbLocalizationManager.localizations.get(`${language}-${region}`) : undefined,
		umbLocalizationManager.localizations.get(language),
		umbLocalizationManager.fallback,
	] as Array<Record<string, unknown> | undefined>;

	for (const set of sets) {
		const entry = set && Object.prototype.hasOwnProperty.call(set, key) ? set[key] : undefined;
		if (typeof entry === 'string' && entry) return entry;
		if (typeof entry === 'function') return String((entry as () => unknown)());
	}

	return key;
}
