import { defineConfig } from 'vite';

// Builds the plugin as one ES module into the TestSite's App_Plugins folder, next to the
// umbraco-package.json that registers it. That folder also holds the manifests, so it is
// never emptied. Both Umbraco and TinyMCE.Umbraco are provided by the backoffice at runtime.
export default defineConfig({
	build: {
		lib: {
			entry: 'mentions.tinymce-api.ts',
			formats: ['es'],
			fileName: () => 'tinymce-mentions-plugin.js',
		},
		outDir: '../../src/TinyMCE.Umbraco.TestSite/wwwroot/App_Plugins/tinymce-mentions-plugin',
		emptyOutDir: false,
		sourcemap: true,
		rollupOptions: {
			external: [/^@tiny-mce-umbraco\//, /^@umbraco-cms\//],
		},
	},
});
