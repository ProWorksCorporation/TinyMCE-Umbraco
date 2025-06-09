import type { ManifestTinyMcePlugin } from '@tiny-mce-umbraco/backoffice/core';

export const manifests: Array<ManifestTinyMcePlugin> = [
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.CodeEditor',
		name: 'Code Editor TinyMCE Plugin',
		js: () => import('./tiny-mce-code-editor.plugin.js'),
		meta: {
			toolbar: [
				{
					alias: 'sourcecode',
					label: 'Source code editor',
					icon: 'sourcecode',
					isplugin: false,
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.MediaPicker',
		name: 'Media Picker TinyMCE Plugin',
		js: () => import('./tiny-mce-mediapicker.plugin.js'),
		meta: {
			toolbar: [
				{
					alias: 'umbmediapicker',
					label: 'Image',
					icon: 'image',
					isplugin: false,
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.EmbeddedMedia',
		name: 'Embedded Media TinyMCE Plugin',
		js: () => import('./tiny-mce-embeddedmedia.plugin.js'),
		meta: {
			toolbar: [
				{
					alias: 'umbembeddialog',
					label: 'Embed',
					icon: 'embed',
					isplugin: false,
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.BlockPicker',
		name: 'Block Picker TinyMCE Plugin',
		js: () => import('./tiny-mce-block-picker.plugin.js'),
		meta: {
			toolbar: [
				{
					alias: 'umbblockpicker',
					label: '#blockEditor_insertBlock',
					icon: 'visualblocks',
					isplugin: false,
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.MultiUrlPicker',
		name: 'Multi Url Picker TinyMCE Plugin',
		js: () => import('./tiny-mce-multi-url-picker.plugin.js'),
		meta: {
			toolbar: [
				{
					alias: 'link',
					label: 'Insert/Edit link',
					icon: 'link',
					isplugin: false,
				},
				{
					alias: 'unlink',
					label: 'Remove link',
					icon: 'unlink',
					isplugin: false,
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Accordion',
		name: 'TinyMCE Accorion Plugin',
		meta: {
			plugins: ['accordion'],
			toolbar: [
				{
					alias: 'accordion',
					label: 'Accordion',
					icon: 'accordion',
					isplugin: true,
					pluginAlias: 'accordion',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.CodeSample',
		name: 'TinyMCE Code Sample Plugin',
		meta: {
			plugins: ['codesample'],
			toolbar: [
				{
					alias: 'codesample',
					label: 'Code Sample',
					icon: 'code-sample',
					isplugin: true,
					pluginAlias: 'codesample',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Emoticons',
		name: 'TinyMCE Emoticons Plugin',
		meta: {
			plugins: ['emoticons'],
			toolbar: [
				{
					alias: 'emoticons',
					label: 'Emoticons',
					icon: 'emoji',
					isplugin: true,
					pluginAlias: 'emoticons',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Help',
		name: 'TinyMCE Help Plugin',
		meta: {
			plugins: ['help'],
			toolbar: [
				{
					alias: 'help',
					label: 'Help for Editors',
					icon: 'help',
					isplugin: true,
					pluginAlias: 'help',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.InsertDateTime',
		name: 'TinyMCE Insert Date/Time Plugin',
		meta: {
			plugins: ['insertdatetime'],
			toolbar: [
				{
					alias: 'insertdatetime',
					label: 'Insert Date/Time',
					icon: 'insert-time',
					isplugin: true,
					pluginAlias: 'insertdatetime',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.SearchReplace',
		name: 'TinyMCE Search and Replace Plugin',
		meta: {
			plugins: ['searchreplace'],
			toolbar: [
				{
					alias: 'searchreplace',
					label: 'Search and Replace',
					icon: 'search',
					isplugin: true,
					pluginAlias: 'searchreplace',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.WordCount',
		name: 'TinyMCE Word Count Plugin',
		meta: {
			plugins: ['wordcount'],
			toolbar: [
				{
					alias: 'wordcount',
					label: 'Word Count',
					icon: 'character-count',
					isplugin: true,
					pluginAlias: 'wordcount',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Accessibilty',
		name: 'TinyMCE Accessibilty Checker Plugin',
		js: () => import('./core/a11ychecker.tinymce-api.js'),
		meta: {
			plugins: ['a11ychecker'],
			toolbar: [
				{
					alias: 'a11ycheck',
					label: 'Accessibility Checker (Premium Plugin)',
					icon: 'accessibility-check',
					isplugin: true,
					pluginAlias: 'a11ychecker',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.AdvancedCodeEditor',
		name: 'TinyMCE Advanced Code Editor Plugin',
		meta: {
			plugins: ['advcode'],
			toolbar: [
				{
					alias: 'code',
					label: 'Advanced Code Editor (Premium Plugin)',
					icon: 'sourcecode',
					isplugin: true,
					pluginAlias: 'advcode',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.AdvancedTableEditor',
		name: 'TinyMCE Advanced Table Editor Plugin',
		meta: {
			plugins: ['advtable'],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.AdvancedTemplates',
		name: 'TinyMCE Advanced Templates Plugin',
		meta: {
			plugins: ['advtemplate'],
			toolbar: [
				{
					alias: 'inserttemplate',
					label: 'Advanced Templates (Premium Plugin)',
					icon: 'template',
					isplugin: true,
					pluginAlias: 'advtemplate',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Typography',
		name: 'TinyMCE Advanced Typography Plugin',
		meta: {
			plugins: ['typography'],
			toolbar: [
				{
					alias: 'typography',
					label: 'Advanced Typography (Premium Plugin)',
					icon: 'typography',
					isplugin: true,
					pluginAlias: 'typography',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.AIAssistantShortcuts',
		name: 'TinyMCE AI Assistant Shortcuts Plugin',
		js: () => import('./core/ai-assistant.tinymce-api'),
		meta: {
			plugins: ['ai'],
			toolbar: [
				{
					alias: 'aishortcuts aidialog',
					label: 'AI Assistant Shortcuts (Premium Plugin)',
					icon: 'ai',
					isplugin: true,
					pluginAlias: 'ai',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.CaseChange',
		name: 'TinyMCE Case Change Plugin',
		meta: {
			plugins: ['casechange'],
			toolbar: [
				{
					alias: 'casechange',
					label: 'Case Change (Premium Plugin)',
					icon: 'change-case',
					isplugin: true,
					pluginAlias: 'casechange',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Checklist',
		name: 'TinyMCE Checklist Plugin',
		meta: {
			plugins: ['checklist'],
			toolbar: [
				{
					alias: 'checklist',
					label: 'Checklist (Premium Plugin)',
					icon: 'checklist',
					isplugin: true,
					pluginAlias: 'checklist',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.EnhancedMediaEmbed',
		name: 'TinyMCE Enhanced Media Embed Plugin',
		meta: {
			plugins: ['mediaembed'],
			toolbar: [
				{
					alias: 'media',
					label: 'Enhanced Media Embed (Premium Plugin)',
					icon: 'image',
					isplugin: true,
					pluginAlias: 'mediaembed',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Export',
		name: 'TinyMCE Export Plugin',
		meta: {
			plugins: ['export'],
			toolbar: [
				{
					alias: 'export',
					label: 'Export (Premium Plugin)',
					icon: 'export',
					isplugin: true,
					pluginAlias: 'export',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.Footnotes',
		name: 'TinyMCE Footnotes Plugin',
		meta: {
			plugins: ['footnotes'],
			toolbar: [
				{
					alias: 'footnotes',
					label: 'Footnotes (Premium Plugin)',
					icon: 'footnote',
					isplugin: true,
					pluginAlias: 'footnotes',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.FormatPainter',
		name: 'TinyMCE Format Painter Plugin',
		meta: {
			plugins: ['formatpainter'],
			toolbar: [
				{
					alias: 'formatpainter',
					label: 'Format Painter (Premium Plugin)',
					icon: 'format-painter',
					isplugin: true,
					pluginAlias: 'formatpainter',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.MergeTags',
		name: 'TinyMCE Merge Tags Plugin',
		meta: {
			plugins: ['mergetags'],
			toolbar: [
				{
					alias: 'mergetags',
					label: 'Merge Tags (Premium Plugin)',
					icon: 'addtag',
					isplugin: true,
					pluginAlias: 'mergetags',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.PageEmbed',
		name: 'TinyMCE Page Embed Plugin',
		meta: {
			plugins: ['pageembed'],
			toolbar: [
				{
					alias: 'pageembed',
					label: 'Page Embed (Premium Plugin)',
					icon: 'embed-page',
					isplugin: true,
					pluginAlias: 'pageembed',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.PowerPaste',
		name: 'TinyMCE PowerPaste Plugin',
		meta: {
			plugins: ['powerpaste'],
			toolbar: [
				{
					alias: 'paste',
					label: 'PowerPaste (Premium Plugin)',
					icon: 'paste',
					isplugin: true,
					pluginAlias: 'powerpaste',
				},
			],
		},
	},

	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.PermanentPen',
		name: 'TinyMCE Permanent Pen Plugin',
		meta: {
			plugins: ['permanentpen'],
			toolbar: [
				{
					alias: 'permanentpen',
					label: 'Permanent Pen (Premium Plugin)',
					icon: 'permanent-pen',
					isplugin: true,
					pluginAlias: 'permanentpen',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.SpellChecker',
		name: 'TinyMCE Spell Checker Pro Plugin',
		meta: {
			plugins: ['tinymcespellchecker'],
			toolbar: [
				{
					alias: 'spellchecker',
					label: 'Spell Checker Pro (Premium Plugin)',
					icon: 'spell-check',
					isplugin: true,
					pluginAlias: 'tinymcespellchecker',
				},
			],
		},
	},
	{
		type: 'tinyMcePlugin',
		alias: 'Umb.TinyMcePlugin.TableOfContents',
		name: 'TinyMCE Table of Contents Plugin',
		meta: {
			plugins: ['tableofcontents'],
			toolbar: [
				{
					alias: 'tableofcontents',
					label: 'Table of Contents (Premium Plugin)',
					icon: 'toc',
					isplugin: true,
					pluginAlias: 'tableofcontents',
				},
			],
		},
	},
];
