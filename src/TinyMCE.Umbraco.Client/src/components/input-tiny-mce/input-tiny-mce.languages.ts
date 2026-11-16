/**
 * The TinyMCE language packs this package ships: exactly the files in tinymce-i18n's `langs6` folder, which the build
 * copies to `lib/langs` (see `vite.config.ts`). Keep the two in step when tinymce-i18n is upgraded:
 * `input-tiny-mce.languages.test.ts` fails for a code with no file, which TinyMCE would request and get a 404 for.
 */
export const availableLanguages: string[] = [
	'ar',
	'ar_SA',
	'az',
	'be',
	'bg_BG',
	'bn_BD',
	'ca',
	'cs',
	'cy',
	'da',
	'de',
	'dv',
	'el',
	'eo',
	'es',
	'es_MX',
	'et',
	'eu',
	'fa',
	'fi',
	'fr_FR',
	'ga',
	'gl',
	'he_IL',
	'hi',
	'hr',
	'hu_HU',
	'hy',
	'id',
	'is_IS',
	'it',
	'ja',
	'ka_GE',
	'kab',
	'kk',
	'ko_KR',
	'ku',
	'lt',
	'lv',
	'nb_NO',
	'ne',
	'nl',
	'nl_BE',
	'oc',
	'pl',
	'pt_BR',
	'ro',
	'ru',
	'sk',
	'sl_SI',
	'sq',
	'sr',
	'sv_SE',
	'ta',
	'tg',
	'th_TH',
	'tr',
	'ug',
	'uk',
	'uz',
	'vi',
	'zh-Hans',
	'zh-Hant',
	'zh_HK',
	'zh_MO',
	'zh_SG',
];

/** Where the build puts the language packs, relative to the Umbraco server. */
export const LANGUAGE_PACK_PATH = '/App_Plugins/TinyMCE.Umbraco/lib/langs/';

const normalise = (code: string) => code.replace(/_/g, '-').toLowerCase();

/**
 * Picks the TinyMCE language pack for a backoffice language.
 *
 * Umbraco reports the user's language as a lower-case BCP 47 tag (`da-dk`, `pt-br`, `zh-cn`), while the packs are
 * named `da`, `pt_BR` and `zh-Hans`. Tries, in order: the language and region (`pt_BR`), the language and its script
 * (`zh-Hans` for `zh-cn`, as tinymce-i18n names its main Chinese packs by script), the bare language (`da`), and then
 * another region of the same language (`fr_FR` for `fr-ch`).
 *
 * @param {string | undefined} language The backoffice language, e.g. `this.localize.lang()`.
 * @param {readonly string[]} available The packs to choose from.
 * @returns {string | undefined} The pack's code, or `undefined` for English (built into TinyMCE) and for a language
 * with no pack, which leaves TinyMCE in English.
 */
export function resolveTinyMceLanguage(
	language: string | undefined,
	available: readonly string[] = availableLanguages,
): string | undefined {
	if (!language) return undefined;

	let locale: Intl.Locale;
	try {
		locale = new Intl.Locale(language.replace(/_/g, '-'));
	} catch {
		return undefined;
	}

	const find = (tag: string) => available.find((code) => normalise(code) === tag.toLowerCase());
	const lang = locale.language;
	const region = locale.region;
	const script = locale.maximize().script;
	const sameLanguage = available.filter((code) => normalise(code).split('-')[0] === lang);

	return (
		(region && find(`${lang}-${region}`)) ||
		(script && find(`${lang}-${script}`)) ||
		find(lang) ||
		find(`${lang}-${lang}`) ||
		sameLanguage[0]
	);
}

/**
 * Points TinyMCE at the language pack this package ships, so the language loads whichever TinyMCE runs: with no
 * `language_url` TinyMCE looks under its own `base_url`, which for Tiny Cloud or a configured `tinyMceUrl` is a host
 * that may not have that pack, or names it differently (Tiny Cloud has `zh_CN` where tinymce-i18n has `zh-Hans`).
 *
 * Does nothing when configuration changed `language` (that language then loads from wherever TinyMCE looks for it,
 * as before) or set its own `language_url`.
 *
 * @param {object} config The merged editor configuration, changed in place.
 * @param {string | undefined} language The pack picked by `resolveTinyMceLanguage`.
 * @param {string} serverUrl The Umbraco server origin. Falls back to `window.location.origin` if empty.
 */
export function addLanguagePackUrl(
	config: { language?: string; language_url?: string },
	language: string | undefined,
	serverUrl: string,
): void {
	if (!language || config.language !== language || config.language_url) return;
	config.language_url = new URL(`${LANGUAGE_PACK_PATH}${language}.js`, serverUrl || window.location.origin).href;
}
