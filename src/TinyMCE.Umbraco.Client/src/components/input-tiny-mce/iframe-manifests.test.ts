// Which extension manifests the classic-mode iframe gets a copy of. Its realm has its own extension registry, and the
// block components read that one, so anything they look up must be copied in (client CLAUDE.md, "TinyMCE iframe Module
// Scope"). Custom block views were missing, so in classic mode a block never showed its custom view (#206).
import { expect } from '@open-wc/testing';
import { UmbExtensionRegistry } from '@umbraco-cms/backoffice/extension-api';
import type { ManifestBase } from '@umbraco-cms/backoffice/extension-api';
import { iframeManifests } from './iframe-manifests.js';

const manifest = (type: string, alias: string, extra: Record<string, unknown> = {}) =>
	({ type, alias, name: alias, ...extra }) as ManifestBase;

describe('iframeManifests', () => {
	let registry: UmbExtensionRegistry<ManifestBase>;
	const aliases = () => iframeManifests(registry).map((m) => m.alias);

	beforeEach(() => {
		registry = new UmbExtensionRegistry<ManifestBase>();
	});

	it('copies the block actions and the conditions they name', () => {
		registry.registerMany([
			manifest('blockAction', 'action.delete', { conditions: [{ alias: 'condition.hasDelete' }] }),
			manifest('blockAction', 'action.copy'),
			manifest('condition', 'condition.hasDelete'),
			manifest('condition', 'condition.unrelated'),
		]);

		expect(aliases()).to.have.members(['action.delete', 'action.copy', 'condition.hasDelete']);
	});

	it('copies custom block views for rich text blocks, from umbraco-package.json or a bundle', () => {
		registry.registerMany([
			manifest('blockEditorCustomView', 'view.rte', { element: '/App_Plugins/x/view.js', forBlockEditor: 'block-rte' }),
			manifest('blockEditorCustomView', 'view.rteAndList', {
				element: () => import('./iframe-manifests.js'),
				forBlockEditor: ['block-list', 'block-rte'],
			}),
			manifest('blockEditorCustomView', 'view.anyEditor', { element: '/App_Plugins/x/any.js' }),
		]);

		expect(aliases()).to.have.members(['view.rte', 'view.rteAndList', 'view.anyEditor']);
	});

	it('leaves out custom views for other block editors', () => {
		registry.registerMany([
			manifest('blockEditorCustomView', 'view.list', { element: '/App_Plugins/x/list.js', forBlockEditor: 'block-list' }),
			manifest('blockEditorCustomView', 'view.grid', { element: '/App_Plugins/x/grid.js', forBlockEditor: ['block-grid'] }),
		]);

		expect(aliases()).to.deep.equal([]);
	});

	it('copies the conditions a custom view names', () => {
		registry.registerMany([
			manifest('blockEditorCustomView', 'view.conditional', {
				element: '/App_Plugins/x/view.js',
				conditions: [{ alias: 'condition.forView' }],
			}),
			manifest('condition', 'condition.forView'),
		]);

		expect(aliases()).to.have.members(['view.conditional', 'condition.forView']);
	});

	it('copies nothing else', () => {
		registry.registerMany([manifest('dashboard', 'dashboard.welcome'), manifest('propertyEditorUi', 'editor.text')]);

		expect(aliases()).to.deep.equal([]);
	});
});
