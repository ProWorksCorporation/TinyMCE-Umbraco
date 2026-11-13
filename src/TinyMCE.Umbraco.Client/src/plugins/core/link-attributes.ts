// Internal: maps between the link picker's model and the attributes of an `<a>` in the editor content
// (contracts/link-markup.md). Ported from Umbraco 17.8's tiptap `link-attributes.function.ts`; deliberately not
// exported from the package's public entry point.
import type { UmbLinkPickerLink, UmbLinkPickerLinkType } from '@umbraco-cms/backoffice/multi-url-picker';

/**
 * The attributes of a link anchor that the link picker reads and writes. A `null` value means "no such attribute":
 * TinyMCE's `editor.dom.setAttribs` removes it and `editor.dom.createHTML` leaves it out.
 */
export type UmbTinyMceLinkAttributes = {
	href?: string | null;
	title?: string | null;
	target?: string | null;
	type?: string | null;
	rel?: string | null;
	'data-anchor'?: string | null;
	'data-culture'?: string | null;
};

/**
 * The stored form of a local link, as the server recognises it when it resolves one to a URL: the leading slash is
 * optional and the braces may be URL-encoded, in any case. Anchored, so a URL that merely contains the token
 * somewhere in its path or query string is not taken for a local link.
 */
export const LOCAL_LINK_HREF_PATTERN = /^\/?(?:\{|%7B)localLink:(?<id>[^}%]+)(?:\}|%7D)/i;

/**
 * Determines whether an href addresses an entity in this Umbraco installation rather than an arbitrary URL.
 * @param {string | null | undefined} href - The href to test.
 * @returns {boolean} True when the href is a local link.
 */
export function isLocalLinkHref(href: string | null | undefined): boolean {
	return !!href && LOCAL_LINK_HREF_PATTERN.test(href);
}

/**
 * Narrows an anchor's `type` attribute to the entity types a local link can carry.
 * @param {string | null | undefined} type - The `type` attribute.
 * @returns {UmbLinkPickerLinkType | undefined} `'document'` or `'media'`, or undefined for anything else.
 */
function localLinkType(type: string | null | undefined): UmbLinkPickerLinkType | undefined {
	return type === 'document' || type === 'media' ? type : undefined;
}

/**
 * Maps the attributes of an anchor onto the link model the link picker edits.
 * @param {UmbTinyMceLinkAttributes} attrs - The anchor's attributes, or an empty object when there is no anchor.
 * @returns {UmbLinkPickerLink} The link model for the picker.
 */
export function linkFromAttributes(attrs: UmbTinyMceLinkAttributes): UmbLinkPickerLink {
	const queryString = attrs['data-anchor'];
	let url = attrs.href ?? undefined;
	// The anchor or query string is also appended to the href when it is written; take it off again. Unlike the
	// tiptap original, only when the href really ends with it, so a stale `data-anchor` can't cut a URL short.
	if (url && queryString && url.endsWith(queryString)) {
		url = url.substring(0, url.length - queryString.length);
	}

	const unique = (url && LOCAL_LINK_HREF_PATTERN.exec(url)?.groups?.id) || null;
	// Only a local link carries its entity type on the anchor. Anything else with an href was entered as a URL,
	// whatever its `type` says, and no href means nothing has been picked yet.
	const type = unique ? localLinkType(attrs.type) : attrs.href ? 'external' : undefined;

	return {
		name: attrs.title,
		queryString,
		target: attrs.target,
		type,
		unique,
		url,
		// A culture only means something for a document; the link picker selects that variant when it opens.
		culture: type === 'document' ? attrs['data-culture'] : undefined,
	};
}

/**
 * Maps a link from the link picker onto the anchor attributes to write. Every attribute the picker manages is
 * named, `null` when it doesn't apply, so editing an existing link rewrites it wholesale: a legacy
 * `type="external"`, or a `data-anchor` the link no longer has, is removed.
 * @param {UmbLinkPickerLink} link - The link, with its URL already in its final form (`/{localLink:…}` for a local link).
 * @returns {UmbTinyMceLinkAttributes} The anchor attributes.
 */
export function attributesFromLink(link: UmbLinkPickerLink): UmbTinyMceLinkAttributes {
	const queryString = link.queryString || null;
	let href = link.url ?? '';

	if (queryString?.startsWith('?')) {
		href += href ? queryString : '/' + queryString;
	} else if (queryString?.startsWith('#')) {
		href += queryString;
	}

	// The server needs the entity type to resolve a local link (C-LNK-2); an external link has none (C-LNK-1).
	const type = link.unique ? (localLinkType(link.type) ?? null) : null;
	// Written only for a local document link, so changing a link to media or external removes it (US4).
	const culture = type === 'document' && link.culture ? link.culture : null;

	return {
		href,
		title: link.name ?? link.url ?? '',
		target: link.target || null,
		type,
		rel: link.target === '_blank' ? 'noopener' : null,
		'data-anchor': queryString,
		'data-culture': culture,
	};
}
