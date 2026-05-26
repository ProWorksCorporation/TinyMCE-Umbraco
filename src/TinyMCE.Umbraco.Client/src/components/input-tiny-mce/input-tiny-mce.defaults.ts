import { UMB_CONTEXT_REQUEST_EVENT_TYPE, type UmbContextRequestEvent } from '@umbraco-cms/backoffice/context-api';
//import { UmbContextProxyController } from '@umbraco-cms/backoffice/context-proxy';
import type { RawEditorOptions } from '@umbraco-cms/backoffice/external/tinymce';
import { UUIIconRequestEvent } from '@umbraco-cms/backoffice/external/uui';
import { umbLocalizationManager } from '@umbraco-cms/backoffice/localization-api';

export const UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH = '@umbraco-cms/backoffice/block-rte';

export const defaultPremiumPluginsList = [
	'a11ychecker',
	'advcode',
	'advtable',
	'advtemplate',
	'typography',
	'ai',
	'casechange',
	'checklist',
	'mediaembed',
	'export',
	'footnotes',
	'formatpainter',
	'mergetags',
	'pageembed',
	'powerpaste',
	'permanentpen',
	'tinymcespellchecker',
	'tableofcontents',
] as const;

//we use extended_valid_elements only for Umbraco custom elements and non-standard HTML elements
//that must be added on top of valid_elements. Standard HTML elements (h1-h6, div, ul, li, span)
//must NOT appear here because extended_valid_elements overrides valid_elements exclusions —
//if a user removes an element from ValidElements config it would still be allowed via this list.
export const defaultFallbackConfig: RawEditorOptions = {
	plugins: ['anchor', 'charmap', 'table', 'lists', 'advlist', 'autolink', 'directionality', 'searchreplace'],
	valid_elements:
		'+a[id|style|rel|data-id|data-udi|rev|charset|hreflang|dir|lang|tabindex|accesskey|type|name|href|target|title|class|onfocus|onblur|onclick|ondblclick|onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onkeypress|onkeydown|onkeyup],-strong/-b[class|style],-em/-i[class|style],-strike[class|style],-s[class|style],-u[class|style],#p[id|style|dir|class|align],-ol[class|reversed|start|style|type],-ul[class|style],-li[class|style],br[class],img[id|dir|lang|longdesc|usemap|style|class|src|onmouseover|onmouseout|border|alt=|title|hspace|vspace|width|height|align|umbracoorgwidth|umbracoorgheight|onresize|onresizestart|onresizeend|rel|data-id],-sub[style|class],-sup[style|class],-blockquote[dir|style|class],-table[border=0|cellspacing|cellpadding|width|height|class|align|summary|style|dir|id|lang|bgcolor|background|bordercolor],-tr[id|lang|dir|class|rowspan|width|height|align|valign|style|bgcolor|background|bordercolor],tbody[id|class],thead[id|class],tfoot[id|class],#td[id|lang|dir|class|colspan|rowspan|width|height|align|valign|style|bgcolor|background|bordercolor|scope],-th[id|lang|dir|class|colspan|rowspan|width|height|align|valign|style|scope],caption[id|lang|dir|class|style],-div[id|dir|class|align|style|contenteditable|data-embed-url|data-embed-height|data-embed-width|data-embed-constrain],-span[class|align|style|lang],-pre[class|align|style],address[class|align|style],-h1[id|dir|class|align|style],-h2[id|dir|class|align|style],-h3[id|dir|class|align|style],-h4[id|dir|class|align|style],-h5[id|dir|class|align|style],-h6[id|style|dir|class|align|style],hr[class|style],small[class|style],dd[id|class|title|style|dir|lang],dl[id|class|title|style|dir|lang],dt[id|class|title|style|dir|lang],object[class|id|width|height|codebase|*],param[name|value|_value|class],embed[type|width|height|src|class|*],map[name|class],area[shape|coords|href|alt|target|class],bdo[class],button[class],iframe[*],figure,figcaption,cite,video[*],audio[*],picture[*],source[*],canvas[*],details[*],summary[*],-code',
	invalid_elements: 'font',
	extended_valid_elements:
		'@[id|class|style],+umb-rte-block[!data-content-key],+umb-rte-block-inline[!data-content-key],ins[datetime|cite],figure,figcaption,iframe[*]',
	custom_elements: 'umb-rte-block,~umb-rte-block-inline',
	toolbar: [
		'styles',
		'bold',
		'italic',
		'alignleft',
		'aligncenter',
		'alignright',
		'bullist',
		'numlist',
		'outdent',
		'indent',
		'link',
		'umbmediapicker',
		'umbembeddialog',
	],
	// debugging option:
	//setup: function (editor) {
	//	console.log('TinyMCE editor is initializing...');
	//	editor.on('init', function () {
	//		console.log('TinyMCE initialized.');
	//	});
	//	editor.on('PluginLoad', function (e) {
	//		console.log('Plugin loaded:', e.plugin);
	//	});
	//},

	init_instance_callback: function (editor) {
		// The following code is the context api proxy. [NL]
		// It re-dispatches the context api request event to the origin target of this modal, in other words the element that initiated the modal. [NL]
		editor.dom.doc.addEventListener(UMB_CONTEXT_REQUEST_EVENT_TYPE, ((event: UmbContextRequestEvent) => {
			if (!editor.iframeElement) return;

			event.stopImmediatePropagation();
			editor.iframeElement.dispatchEvent(event.clone());
		}) as EventListener);

		//TODO: wire this up
		//editor.dom.doc.addEventListener(UMB_CONTEXT_PROVIDE_EVENT_TYPE, ((event: UmbContextProvideEvent) => {
		//	if (!editor.iframeElement) return;

		//	event.stopImmediatePropagation();
		//	editor.iframeElement.dispatchEvent(event.clone());
		//}) as EventListener);

		// Proxy for retrieving icons from outside the iframe [NL]
		editor.dom.doc.addEventListener(UUIIconRequestEvent.ICON_REQUEST, ((event: UUIIconRequestEvent) => {
			if (!editor.iframeElement) return;

			const newEvent = new UUIIconRequestEvent(UUIIconRequestEvent.ICON_REQUEST, {
				detail: event.detail,
			});
			editor.iframeElement.dispatchEvent(newEvent);
			if (newEvent.icon !== null) {
				event.acceptRequest(newEvent.icon);
			}
		}) as EventListener);

		// Transfer our import-map to the iframe: [NL]
		const importMapTag = document.head.querySelector('script[type="importmap"]');
		if (importMapTag) {
			const importMap = document.createElement('script');
			importMap.type = 'importmap';
			importMap.text = importMapTag.innerHTML;
			editor.dom.doc.head.appendChild(importMap);
		}

		// Transfer our stylesheets to the iframe: [NL]
		const stylesheetTags = document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
		stylesheetTags.forEach((stylesheetTag) => {
			const stylesheet = document.createElement('link');
			stylesheet.rel = 'stylesheet';
			stylesheet.href = stylesheetTag.href;
			editor.dom.doc.head.appendChild(stylesheet);
		});

		editor.dom.doc.addEventListener('click', (e: MouseEvent) => {
			// If we try to open link in a new tab, then we want to skip skip:
			//if ((isWindows && e.ctrlKey) || (!isWindows && e.metaKey)) return;

			const composedPaths = 'composedPath' in e ? e.composedPath() : null;

			// Find the target by using the composed path to get the element through the shadow boundaries.
			// Notice the difference here compared to RouterSlots implementation [NL]
			const $anchor: HTMLAnchorElement =
				(composedPaths?.find(
					($elem) => $elem instanceof HTMLAnchorElement || ($elem as any).tagName === 'A'
				) as HTMLAnchorElement) ?? (e.target as HTMLAnchorElement);

			// Abort if the event is not about the anchor tag or the anchor tag has the attribute [data-router-slot]="disabled"
			if (
				$anchor == null ||
				!($anchor instanceof HTMLAnchorElement || ($anchor as any).tagName === 'A') ||
				$anchor.dataset['routerSlot'] === 'disabled'
			) {
				return;
			}

			// Abort if the anchor tag is not inside a block element
			const isInsideBlockElement =
				composedPaths?.some(
					($elem) => ($elem as any).tagName === 'UMB-RTE-BLOCK' || ($elem as any).tagName === 'UMB-RTE-BLOCK-INLINE'
				) ?? false;

			if (!isInsideBlockElement) {
				return;
			}

			// Remove the origin from the start of the HREF to get the path
			const path = $anchor.pathname + $anchor.search + $anchor.hash;

			// Prevent the default behavior
			e.preventDefault();

			// Change the history!
			window.history.pushState(null, '', path);
		});

		// Sync block editor localization keys into the iframe's module-scope umbLocalizationManager.
		// The iframe has a completely separate module scope (and thus a separate umbLocalizationManager
		// instance) from the outer document. Without this, requestDelete() in UmbBlockEntryContext
		// falls back to returning raw keys because the iframe's manager has no registered translations.
		const locSetsToSync: Array<Record<string, string>> = [];
		const BLOCK_LOC_KEYS = ['blockEditor_confirmDeleteBlockTitle', 'blockEditor_confirmDeleteBlockMessage'];
		umbLocalizationManager.localizations.forEach((locSet, code) => {
			const locSetAny = locSet as unknown as Record<string, string>;
			const entry: Record<string, string> = {
				$code: code,
				$dir: locSetAny['$dir'] ?? 'ltr',
			};
			let hasKey = false;
			for (const key of BLOCK_LOC_KEYS) {
				const val = locSetAny[key];
				if (typeof val === 'string') {
					entry[key] = val;
					hasKey = true;
				}
			}
			if (hasKey) locSetsToSync.push(entry);
		});

		if (locSetsToSync.length > 0) {
			const locScript = document.createElement('script');
			locScript.setAttribute('type', 'module');
			locScript.text = `
				import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
				${JSON.stringify(locSetsToSync)}.forEach(s => umbLocalizationManager.registerLocalization(s));
			`;
			editor.dom.doc.head.appendChild(locScript);
		}

		// Load backoffice JS so we can get the umb-rte-block component registered inside the iframe [NL]
		const script = document.createElement('script');
		script.type = 'text/javascript';
		script.setAttribute('type', 'module');

		script.text = `import "@umbraco-cms/backoffice/extension-registry";`;
		script.text = `import "${UMB_BLOCK_ENTRY_WEB_COMPONENTS_ABSOLUTE_PATH}";`;
		editor.dom.doc.head.appendChild(script);
	},

	style_formats: [
		{
			title: 'Headers',
			items: [
				{ title: 'Page header', block: 'h2' },
				{ title: 'Section header', block: 'h3' },
				{ title: 'Paragraph header', block: 'h4' },
			],
		},
		{
			title: 'Blocks',
			items: [{ title: 'Paragraph', block: 'p' }],
		},
		{
			title: 'Containers',
			items: [
				{ title: 'Quote', block: 'blockquote' },
				{ title: 'Code', block: 'code' },
			],
		},
	],
	/**
	 * @description The maximum image size in pixels that can be inserted into the editor.
	 * @remarks This is registered and used by the UmbMediaPicker plugin
	 */
	maxImageSize: 500,
};
