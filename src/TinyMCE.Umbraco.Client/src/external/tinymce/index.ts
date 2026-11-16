/* eslint local-rules/enforce-umbraco-external-imports: 0 */
/**
 * TinyMce is a CommonJS module, but in order to make @web/test-runner happy
 * we need to load it as a default and then manually register it in the browser
 * as a global variable, so that we can find it and use it in our tests.
 * We are also loading the default icons, so that we can use them outside of a TinyMce instance.
 */

import type { RawEditorOptions, TinyMCE } from 'tinymce';

export type * from 'tinymce';

export const defaultConfig: RawEditorOptions = {
	base_url: '/App_Plugins/TinyMCE.Umbraco/lib',
};

let loadPromise: Promise<TinyMCE> | undefined;

/**
 * Loads the TinyMCE core that ships with this package, unless something else already claimed the
 * `window.tinymce` global.
 *
 * This deliberately does NOT happen eagerly from the `TinyMCE.Lib` bundle any more. A site hosting
 * its own TinyMCE (on premises, or the Tiny Cloud CDN) is documented to register a bundle that
 * declares `overwrites: "TinyMCE.Lib"` - but `overwrites` is only honoured by
 * `UmbBaseExtensionsInitializer`, which is what extension *slots* use. `UmbBundleExtensionInitializer`
 * subscribes straight to `extensionRegistry.byType('bundle')`, whose filter is a plain
 * `ext.type === type` with no overwrite handling, so the default library bundle loaded anyway.
 *
 * Both bundles were then imported concurrently from one `Promise.allSettled`, and TinyMCE's UMD
 * assigns `window.tinymce` unconditionally at the end of its evaluation - so whichever core finished
 * downloading last silently won. A ~768KB local file racing a CDN round trip flips with cache state,
 * which is why the editor came up blank on a cold cache and worked after a hard refresh: the packaged
 * v6 core would win, while `base_url` still pointed at the configured v8 assets, and `init` failed
 * before it ever requested a skin. See issue #225.
 *
 * Resolving the core lazily removes the race instead of trying to win it. By the time anything calls
 * this, every bundle has already been imported - Umbraco's app element gates its routes on
 * `UmbBundleExtensionInitializer.loaded` - so an overriding bundle has provably had its chance to set
 * the global, and we only fall back to the packaged core when nobody did.
 */
export function loadTinyMce(): Promise<TinyMCE> {
	if (window.tinymce) return Promise.resolve(window.tinymce);
	return (loadPromise ??= (async () => {
		await import('tinymce');
		// Must follow the core: icons.js registers itself against the `tinymce` global.
		await import('tinymce/icons/default/icons.js');
		return window.tinymce;
	})());
}

/**
 * The TinyMCE global.
 *
 * A live view of `window.tinymce` rather than a snapshot taken when this module happened to be
 * evaluated - which, now that the core loads on demand, may well be before any core exists. Methods
 * are bound to the real global so that calling them through this object behaves identically to
 * calling them on `window.tinymce`.
 *
 * Callers that may run before the first editor is rendered should `await loadTinyMce()` first;
 * accessing this object does not itself load the core.
 */
export const tinymce: TinyMCE = new Proxy({} as TinyMCE, {
	get(_target, prop) {
		const target = window.tinymce as unknown as Record<string | symbol, unknown> | undefined;
		if (!target) return undefined;
		const value = target[prop];
		return typeof value === 'function' ? value.bind(target) : value;
	},
	has(_target, prop) {
		return window.tinymce ? prop in window.tinymce : false;
	},
	ownKeys() {
		return window.tinymce ? Reflect.ownKeys(window.tinymce) : [];
	},
	// `ownKeys` must report a descriptor for every key it returns, and the proxy target is an empty
	// object with none - so synthesise configurable ones to satisfy the invariant.
	getOwnPropertyDescriptor(_target, prop) {
		if (!window.tinymce) return undefined;
		const descriptor = Reflect.getOwnPropertyDescriptor(window.tinymce, prop);
		return descriptor ? { ...descriptor, configurable: true } : undefined;
	},
});

/* Initialize TinyMCE */
export async function renderEditor(userConfig?: RawEditorOptions) {
	const core = await loadTinyMce();
	const config = { ...defaultConfig, ...userConfig };
	return core.init(config);
}

// Declare a global variable to hold the TinyMCE instance
declare global {
	interface Window {
		/**
		 * @TJS-ignore
		 */
		tinymce: TinyMCE;
	}
}
