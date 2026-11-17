// Our localization manifests add terms on top of Umbraco's own for the same culture, and where both define a key, ours
// wins. The package used to redefine Umbraco's block-delete terms (added for #172), and the Danish heading had a broken
// placeholder ('Slet %0' for Umbraco's 'Slet %0%?'), so Danish users saw "Slet %0" instead of the block's name.
// Umbraco (17.8+, 18.3+) ships those terms itself, so the package should only add keys Umbraco doesn't have.
import { expect } from '@open-wc/testing';
import { manifests } from './manifests.js';

type Dictionary = Record<string, Record<string, unknown>>;
type LocalizationManifest = { meta: { culture: string; localizations: Dictionary } };

describe('localizations', () => {
	for (const manifest of manifests as unknown as LocalizationManifest[]) {
		const culture = manifest.meta.culture;

		it(`adds only terms Umbraco doesn't translate itself (${culture})`, async () => {
			// Umbraco names its files by language (cs.js for cs-CZ). A term in a regional set like ours (cs-cz) would
			// shadow the language set's, so the language file is the one to compare against.
			const language = new Intl.Locale(culture).language;
			const umbraco: Dictionary = (
				await import(`/node_modules/@umbraco-cms/backoffice/dist-cms/assets/lang/${language}.js`)
			).default;
			const ours = manifest.meta.localizations as Dictionary;

			const overridden = Object.entries(ours).flatMap(([section, terms]) =>
				Object.keys(terms).filter((key) => umbraco[section]?.[key] !== undefined).map((key) => `${section}_${key}`),
			);
			expect(overridden).to.deep.equal([]);
		});
	}
});
