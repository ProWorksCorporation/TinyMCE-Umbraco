import arLocalization from './ar.js';
import bsLocalization from './bs.js';
import csLocalization from './cs.js';
import cyLocalization from './cy.js';
import daLocalization from './da.js';
import deLocalization from './de.js';
import enLocalization from './en.js';
import frLocalization from './fr.js';
import hrLocalization from './hr.js';
import itLocalization from './it.js';
import nlLocalization from './nl.js';
import trLocalization from './tr.js';

export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'localization',
		name: 'TinyMCE Umbraco English Localization',
		alias: 'Umb.TinyMCE.Localization.English',
		meta: { culture: 'en', localizations: enLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Arabic Localization',
		alias: 'Umb.TinyMCE.Localization.Arabic',
		weight: -100,
		meta: { culture: 'ar', localizations: arLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Bosnian Localization',
		alias: 'Umb.TinyMCE.Localization.Bosnian',
		weight: -100,
		meta: { culture: 'bs', localizations: bsLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Czech Localization',
		alias: 'Umb.TinyMCE.Localization.Czech',
		weight: -100,
		meta: { culture: 'cs-cz', localizations: csLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Welsh Localization',
		alias: 'Umb.TinyMCE.Localization.Cy-GB',
		weight: -100,
		meta: { culture: 'cy', localizations: cyLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Danish Localization',
		alias: 'Umb.TinyMCE.Localization.Da_DK',
		weight: -100,
		meta: { culture: 'da', localizations: daLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco German Localization',
		alias: 'Umb.TinyMCE.Localization.German',
		weight: -100,
		meta: { culture: 'de', localizations: deLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco French Localization',
		alias: 'Umb.TinyMCE.Localization.French',
		weight: -100,
		meta: { culture: 'fr', localizations: frLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Croatian Localization',
		alias: 'Umb.TinyMCE.Localization.Croatian',
		weight: -100,
		meta: { culture: 'hr', localizations: hrLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Italian Localization',
		alias: 'Umb.TinyMCE.Localization.Italian',
		weight: -100,
		meta: { culture: 'it', localizations: itLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Dutch Localization',
		alias: 'Umb.TinyMCE.Localization.Dutch',
		weight: -100,
		meta: { culture: 'nl', localizations: nlLocalization },
	},
	{
		type: 'localization',
		name: 'TinyMCE Umbraco Turkish Localization',
		alias: 'Umb.TinyMCE.Localization.Turkish',
		weight: -100,
		meta: { culture: 'tr', localizations: trLocalization },
	},
];
