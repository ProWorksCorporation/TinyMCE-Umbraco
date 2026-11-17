// Picking TinyMCE's UI language from the backoffice user's language (F-G6). Umbraco reports it as a lower-case BCP 47
// tag (`da-dk`), while the language packs we ship from tinymce-i18n are named `da`, `pt_BR`, `zh-Hans`.
import { expect } from '@open-wc/testing';
import { addLanguagePackUrl, availableLanguages, resolveTinyMceLanguage } from './input-tiny-mce.languages.js';

describe('resolveTinyMceLanguage', () => {
	it('falls back to the bare language when there is no regional pack (da-dk → da)', () => {
		expect(resolveTinyMceLanguage('da-dk')).to.equal('da');
	});

	it('matches a regional pack regardless of case and separator (pt-br → pt_BR)', () => {
		expect(resolveTinyMceLanguage('pt-br')).to.equal('pt_BR');
		expect(resolveTinyMceLanguage('PT_BR')).to.equal('pt_BR');
	});

	it('uses the script for Chinese, whose packs are named by script (zh-cn → zh-Hans, zh-tw → zh-Hant)', () => {
		expect(resolveTinyMceLanguage('zh-cn')).to.equal('zh-Hans');
		expect(resolveTinyMceLanguage('zh-tw')).to.equal('zh-Hant');
	});

	it('prefers an exact regional pack over the script one (zh-hk → zh_HK)', () => {
		expect(resolveTinyMceLanguage('zh-hk')).to.equal('zh_HK');
	});

	it("falls back to another region of the same language when there is no bare pack (fr-ch → fr_FR)", () => {
		expect(resolveTinyMceLanguage('fr-ch')).to.equal('fr_FR');
		expect(resolveTinyMceLanguage('fr-fr')).to.equal('fr_FR');
	});

	it('leaves English to TinyMCE, which has it built in (en-us, en-gb, en → undefined)', () => {
		expect(resolveTinyMceLanguage('en-us')).to.equal(undefined);
		expect(resolveTinyMceLanguage('en-gb')).to.equal(undefined);
		expect(resolveTinyMceLanguage('en')).to.equal(undefined);
	});

	it('returns undefined for a language with no pack, or an empty or malformed tag', () => {
		expect(resolveTinyMceLanguage('bs')).to.equal(undefined);
		expect(resolveTinyMceLanguage('')).to.equal(undefined);
		expect(resolveTinyMceLanguage(undefined)).to.equal(undefined);
		expect(resolveTinyMceLanguage('not a tag!')).to.equal(undefined);
	});

	// Every language a backoffice user can pick in Umbraco 17.8 (its `localization` manifests), and what they get.
	const umbracoLanguages: Record<string, string | undefined> = {
		ar: 'ar', bs: undefined, 'cs-cz': 'cs', 'cy-gb': 'cy', 'da-dk': 'da', 'de-ch': 'de', 'de-de': 'de',
		'en-gb': undefined, 'en-us': undefined, 'es-es': 'es', 'fr-ch': 'fr_FR', 'fr-fr': 'fr_FR', 'he-il': 'he_IL',
		'hr-hr': 'hr', 'it-ch': 'it', 'it-it': 'it', 'ja-jp': 'ja', 'ko-kr': 'ko_KR', 'nb-no': 'nb_NO', 'nl-nl': 'nl',
		'pl-pl': 'pl', 'pt-br': 'pt_BR', 'ro-ro': 'ro', 'ru-ru': 'ru', 'sv-se': 'sv_SE', 'tr-tr': 'tr', 'uk-ua': 'uk',
		'vi-vn': 'vi', 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant',
	};
	for (const [umbraco, tiny] of Object.entries(umbracoLanguages)) {
		it(`maps Umbraco's ${umbraco} to ${tiny ?? 'English'}`, () => {
			expect(resolveTinyMceLanguage(umbraco)).to.equal(tiny);
		});
	}
});

describe('availableLanguages', () => {
	// The build copies tinymce-i18n's langs6 folder to lib/langs. A code with no file there makes TinyMCE request a
	// pack that 404s (a LanguageLoadError, and an English editor).
	it('names only language packs that tinymce-i18n ships', async () => {
		const missing: string[] = [];
		await Promise.all(
			availableLanguages.map(async (code) => {
				const response = await fetch(`/node_modules/tinymce-i18n/langs6/${code}.js`, { method: 'HEAD' });
				if (!response.ok) missing.push(code);
			}),
		);
		expect(missing).to.deep.equal([]);
	});
});

describe('addLanguagePackUrl', () => {
	type LanguageOptions = { language?: string; language_url?: string };

	it('points TinyMCE at the language pack this package ships', () => {
		const config: LanguageOptions = { language: 'da' };
		addLanguagePackUrl(config, 'da', 'https://server.test');
		expect(config).to.deep.equal({
			language: 'da',
			language_url: 'https://server.test/App_Plugins/TinyMCE.Umbraco/lib/langs/da.js',
		});
	});

	it('resolves against the page origin when there is no server URL', () => {
		const config: LanguageOptions = { language: 'zh-Hans' };
		addLanguagePackUrl(config, 'zh-Hans', '');
		expect(config.language_url).to.equal(`${window.location.origin}/App_Plugins/TinyMCE.Umbraco/lib/langs/zh-Hans.js`);
	});

	it('leaves a language set in configuration to load from wherever TinyMCE loads it', () => {
		const config: LanguageOptions = { language: 'fr_FR' };
		addLanguagePackUrl(config, 'da', 'https://server.test');
		expect(config).to.deep.equal({ language: 'fr_FR' });
	});

	it('keeps a language_url set in configuration', () => {
		const config: LanguageOptions = { language: 'da', language_url: '/my/da.js' };
		addLanguagePackUrl(config, 'da', 'https://server.test');
		expect(config.language_url).to.equal('/my/da.js');
	});

	it('does nothing for English', () => {
		const config: LanguageOptions = {};
		addLanguagePackUrl(config, undefined, 'https://server.test');
		expect(config).to.deep.equal({});
	});
});
