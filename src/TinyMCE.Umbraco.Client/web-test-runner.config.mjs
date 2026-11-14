// In-browser unit and component tests (`npm test`), modelled on Umbraco's own
// src/Umbraco.Web.UI.Client/web-test-runner.config.mjs, without its import map, mock service worker and a11y
// set-up, which only Umbraco's own source tree needs.
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

const silencedLogs = ['Lit is in dev mode.'];

// The `paths` from tsconfig.json, which neither esbuild nor node-resolve applies here. They point at the `.ts` files
// because that is the URL the esbuild plugin resolves the source's own relative `.js` imports to, so a module reached
// through an alias and through a relative import is one module, not two that both define the same custom element.
const sourceAliases = {
	'@tiny-mce-umbraco/backoffice/core': '/src/index.ts',
	'@tiny-mce-umbraco/backoffice/external/tinymce': '/src/external/tinymce/index.ts',
	'@umbraco-cms/backoffice/external/tinymce': '/src/external/tinymce/index.ts',
	'@umbraco-cms/backoffice/tiny-mce': '/src/external/tinymce/index.ts',
};

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default {
	// Tests live next to the code they test. Vite's `entry` list names its files explicitly, so none of these can
	// end up in the build, and tsconfig.api.json excludes them from the npm typings.
	files: ['src/**/*.test.ts'],
	nodeResolve: true,
	browsers: [playwrightLauncher({ product: 'chromium' })],
	plugins: [
		{
			name: 'tinymce-umbraco-source-aliases',
			resolveImport: ({ source }) => sourceAliases[source],
		},
		esbuildPlugin({ ts: true, tsconfig: './tsconfig.json', target: 'auto' }),
	],
	filterBrowserLogs(log) {
		return !log.args.some((arg) => typeof arg === 'string' && silencedLogs.some((silenced) => arg.includes(silenced)));
	},
};
