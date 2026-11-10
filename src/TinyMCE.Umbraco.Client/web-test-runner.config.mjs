// In-browser unit and component tests (`npm test`), modelled on Umbraco's own
// src/Umbraco.Web.UI.Client/web-test-runner.config.mjs, without its import map, mock service worker and a11y
// set-up, which only Umbraco's own source tree needs.
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

const silencedLogs = ['Lit is in dev mode.'];

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default {
	// Tests live next to the code they test. Vite's `entry` list names its files explicitly, so none of these can
	// end up in the build, and tsconfig.api.json excludes them from the npm typings.
	files: ['src/**/*.test.ts'],
	nodeResolve: true,
	browsers: [playwrightLauncher({ product: 'chromium' })],
	plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json', target: 'auto' })],
	filterBrowserLogs(log) {
		return !log.args.some((arg) => typeof arg === 'string' && silencedLogs.some((silenced) => arg.includes(silenced)));
	},
};
