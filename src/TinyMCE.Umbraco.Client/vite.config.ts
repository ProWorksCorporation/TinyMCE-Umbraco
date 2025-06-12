import { defineConfig, PluginOption } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteTSConfigPaths from 'vite-tsconfig-paths';

export const plugins: PluginOption[] = [
	viteStaticCopy({
		targets: [
			{
				src: 'node_modules/tinymce/*',
				dest: 'lib',
			},
			{
				src: 'node_modules/tinymce-i18n/langs6/*',
				dest: 'lib/langs',
			},
		],
	}),
	viteTSConfigPaths(),
];

export default defineConfig({
	build: {
		lib: {
			entry: ['src/index.ts', 'src/tinymce.ts', 'src/manifests.ts'],
			formats: ['es'],
		},
		outDir: '../TinyMCE.Umbraco/wwwroot/App_Plugins/TinyMCE',
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			external: [/^@umbraco/],
		},
	},
	plugins,
});
