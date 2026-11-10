import { filter, firstValueFrom } from '@umbraco-cms/backoffice/external/rxjs';
import type { Observable } from '@umbraco-cms/backoffice/external/rxjs';

/** Where Umbraco serves the picked stylesheets when the server has not reported `Global:UmbracoCssPath`. */
export const DEFAULT_STYLESHEET_ROOT_PATH = '/css';

/** Umbraco's own base styles for rich text content, always added after the configured stylesheets. */
const RTE_CONTENT_STYLESHEET = '/umbraco/backoffice/css/rte-content.css';

/**
 * Resolves a configured stylesheet path to an absolute href on the Umbraco server.
 *
 * Ported from Umbraco 17.8's `resolve-stylesheet-href.function.ts` (Tiptap), with this package's backslash
 * normalisation applied first. Prefixing the root path unconditionally is wrong in two cases: a path that already
 * includes it (older configurations stored the full `/css/foo.css`, which became `/css/css/foo.css` and 404'd), and
 * an external stylesheet, absolute (`https://…`) or protocol-relative (`//…`, which used to become `/css//…`).
 * @param {string} stylesheet The configured stylesheet path, relative to `rootPath`.
 * @param {string} rootPath The stylesheet root path reported by the server, e.g. `/css`.
 * @param {string} serverUrl The Umbraco server origin. Falls back to `window.location.origin` if empty.
 * @returns {string} The href to put in `content_css`.
 */
export function resolveStylesheetHref(stylesheet: string, rootPath: string, serverUrl: string): string {
	const path = stylesheet.replace(/\\/g, '/');
	if (path.startsWith('http') || path.startsWith('//')) return path;
	const relativeHref = path.startsWith(rootPath) ? path : `${rootPath}${path}`;
	return new URL(relativeHref, serverUrl || window.location.origin).href;
}

/**
 * Waits for the stylesheet root path, then resolves every configured stylesheet and appends Umbraco's
 * `rte-content.css`, all as absolute URLs on the Umbraco server.
 *
 * TinyMCE takes `content_css` once, at init, so unlike Tiptap (which re-renders its `<link>`s when the root path
 * changes) the editor must not be configured before the root path is known, or a non-default `UmbracoCssPath` is
 * silently replaced by `/css` for that editor.
 * @param {Array<string>} stylesheets The configured stylesheet paths.
 * @param {Observable<string | undefined>} rootPath The root path; `undefined` until the server context reports it.
 * @param {() => string} getServerUrl The Umbraco server origin, read once the root path is known.
 * @returns {Promise<Array<string>>} The hrefs for `content_css`.
 */
export async function resolveStylesheetHrefs(
	stylesheets: Array<string>,
	rootPath: Observable<string | undefined>,
	getServerUrl: () => string,
): Promise<Array<string>> {
	const root = await firstValueFrom(rootPath.pipe(filter((value): value is string => value !== undefined)));
	const serverUrl = getServerUrl();

	return [
		...stylesheets.map((stylesheet) => resolveStylesheetHref(stylesheet, root, serverUrl)),
		new URL(RTE_CONTENT_STYLESHEET, serverUrl || window.location.origin).href,
	];
}
