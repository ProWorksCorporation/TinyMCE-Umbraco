import { manifests as components } from './components/manifests.js';
import { manifests as entryPoints } from './entry-points/manifest.js';
import { manifests as icons } from './icons/manifests.js';
import { manifests as localizations } from './localizations/manifests.js';
import { manifests as propertyEditors } from './property-editors/manifests.js';
import { manifests as plugins } from './plugins/manifests.js';
import { manifests as stylesheets } from './stylesheets/manifests.js';

export const manifests: Array<UmbExtensionManifest> = [
	...components,
	...entryPoints,
	...icons,
	...localizations,
	...propertyEditors,
	...plugins,
	...stylesheets,
];
