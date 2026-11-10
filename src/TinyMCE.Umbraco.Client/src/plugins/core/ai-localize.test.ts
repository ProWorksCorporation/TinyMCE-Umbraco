// aiTerm resolves a term without a controller host (research R5), in the same order as UmbLocalizationController:
// the regional set, then the language set, then the English fallback, then the key itself.
import { expect } from '@open-wc/testing';
import { umbLocalizationManager } from '@umbraco-cms/backoffice/localization-api';
import { aiTerm } from './ai-localize.js';

describe('aiTerm', () => {
	let previousLanguage: string;

	before(() => {
		umbLocalizationManager.registerManyLocalizations([
			{
				$code: 'da-DK',
				$dir: 'ltr',
				tinyMceTest_regional: 'regional da-DK',
				tinyMceTest_everywhere: 'from da-DK',
				tinyMceTest_function: () => 'from a function',
			},
			{ $code: 'da', $dir: 'ltr', tinyMceTest_language: 'language da', tinyMceTest_everywhere: 'from da' },
			{ $code: 'en', $dir: 'ltr', tinyMceTest_fallback: 'fallback en', tinyMceTest_everywhere: 'from en' },
		] as never);
	});

	beforeEach(() => {
		// The registry writes documentLanguage when the user's language loads; the manager reads <html lang> only once.
		previousLanguage = umbLocalizationManager.documentLanguage;
		umbLocalizationManager.documentLanguage = 'da-DK';
	});

	afterEach(() => {
		umbLocalizationManager.documentLanguage = previousLanguage;
	});

	it('uses an exact match on documentLanguage first', () => {
		expect(aiTerm('tinyMceTest_regional')).to.equal('regional da-DK');
		expect(aiTerm('tinyMceTest_everywhere')).to.equal('from da-DK');
	});

	it('falls back to the language part (da-DK → da)', () => {
		expect(aiTerm('tinyMceTest_language')).to.equal('language da');
	});

	it('falls back to the English fallback set', () => {
		expect(aiTerm('tinyMceTest_fallback')).to.equal('fallback en');
	});

	it('returns the key itself when nothing matches', () => {
		expect(aiTerm('tinyMceTest_missing')).to.equal('tinyMceTest_missing');
	});

	it('is case-insensitive about documentLanguage, as the registry lower-cases it', () => {
		umbLocalizationManager.documentLanguage = 'da-dk';
		expect(aiTerm('tinyMceTest_regional')).to.equal('regional da-DK');
	});

	it('calls a function entry with no arguments', () => {
		expect(aiTerm('tinyMceTest_function')).to.equal('from a function');
	});

	it('uses the English fallback for an English (UK) user', () => {
		umbLocalizationManager.documentLanguage = 'en-gb';
		expect(aiTerm('tinyMceTest_everywhere')).to.equal('from en');
	});
});
