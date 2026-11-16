// Characterisation tests for UmbStylesheetRuleManager: they assert today's behaviour, including its exact output
// whitespace. Cases marked "Surprise" are listed in specs/004-upgrade-umbraco-17-8/baseline.md.
import { expect } from '@open-wc/testing';
import { UmbStylesheetRuleManager } from './stylesheet-rule-manager.js';
import type { UmbStylesheetRule } from '../types.js';

describe('UmbStylesheetRuleManager', () => {
	const manager = new UmbStylesheetRuleManager();

	describe('extractRules', () => {
		it('throws on empty content', () => {
			expect(() => manager.extractRules('')).to.throw('No Stylesheet content');
		});

		it('returns no rules for a stylesheet without umb_name comments', () => {
			expect(manager.extractRules('body { margin: 0; }\n/* a normal comment */\nh1 { color: red; }')).to.deep.equal([]);
		});

		it('reads one rule: name, selector and styles, trimmed', () => {
			const css = '/**umb_name:Heading*/\nh2 {\n\tcolor: red;\n}\n';

			expect(manager.extractRules(css)).to.deep.equal([{ name: 'Heading', selector: 'h2', styles: 'color: red;' }]);
		});

		it('trims spaces around the name and accepts a space after "/**"', () => {
			const css = '/** umb_name:  Lead text  */\np.lead { font-size: 1.25em; }';

			expect(manager.extractRules(css)).to.deep.equal([
				{ name: 'Lead text', selector: 'p.lead', styles: 'font-size: 1.25em;' },
			]);
		});

		it('keeps inner line breaks between declarations', () => {
			const css = '/**umb_name:Callout*/\n.callout {\n\tcolor: red;\n\tpadding: 1em;\n}';

			expect(manager.extractRules(css)[0].styles).to.equal('color: red;\n\tpadding: 1em;');
		});

		it('reads several rules in order, ignoring other CSS between them', () => {
			const css = [
				'body { margin: 0; }',
				'/**umb_name:One*/ h2 { color: red; }',
				'.not-a-rule { color: blue; }',
				'/**umb_name:Two*/ .two { color: green; }',
			].join('\n');

			expect(manager.extractRules(css).map((rule) => rule.name)).to.deep.equal(['One', 'Two']);
		});

		it('handles a rule with no declarations', () => {
			expect(manager.extractRules('/**umb_name:Empty*/ .empty {}')).to.deep.equal([
				{ name: 'Empty', selector: '.empty', styles: '' },
			]);
		});

		it('drops a rule whose selector contains a comma', () => {
			// Surprise: the selector group excludes ",", so a grouped selector never matches and the rule silently
			// disappears from the Rich Text Editor rule list.
			expect(manager.extractRules('/**umb_name:Headings*/ h1, h2 { color: red; }')).to.deep.equal([]);
		});
	});

	describe('insertRules', () => {
		it('returns an empty string when there is neither content nor rules', () => {
			expect(manager.insertRules('', undefined as unknown as Array<UmbStylesheetRule>)).to.equal('');
		});

		it('appends rules after the existing CSS, in its exact output format', () => {
			const output = manager.insertRules('body { margin: 0; }\n', [
				{ name: 'Lead', selector: 'p.lead', styles: 'font-size: 1.25em;' },
			]);

			// Surprise (cosmetic): a whitespace-only line of six spaces separates the existing CSS from the rules.
			expect(output).to.equal('body { margin: 0; }\n      \n/**umb_name:Lead*/\np.lead {\n\tfont-size: 1.25em;\n}');
		});

		it('writes rules into empty content', () => {
			const output = manager.insertRules('', [{ name: 'Lead', selector: 'p.lead', styles: 'font-size: 1.25em;' }]);

			expect(output).to.equal('/**umb_name:Lead*/\np.lead {\n\tfont-size: 1.25em;\n}');
		});

		it('replaces the existing umb rules rather than adding to them', () => {
			const before = 'body { margin: 0; }\n/**umb_name:Old*/\nh2 {\n\tcolor: red;\n}\n';
			const output = manager.insertRules(before, [{ name: 'New', selector: 'h3', styles: 'color: blue;' }]);

			expect(output).to.not.contain('Old');
			expect(manager.extractRules(output)).to.deep.equal([{ name: 'New', selector: 'h3', styles: 'color: blue;' }]);
			expect(output.startsWith('body { margin: 0; }')).to.be.true;
		});

		it('writes an empty body when a rule has no styles', () => {
			const output = manager.insertRules('', [{ name: 'Bare', selector: '.bare' } as UmbStylesheetRule]);

			expect(output).to.equal('/**umb_name:Bare*/\n.bare {\n\t\n}');
		});

		it('round-trips every rule through insertRules then extractRules', () => {
			const rules: Array<UmbStylesheetRule> = [
				{ name: 'Heading', selector: 'h2', styles: 'color: red;' },
				{ name: 'Lead text', selector: 'p.lead', styles: 'font-size: 1.25em;\n\tline-height: 1.4;' },
				{ name: 'Empty', selector: '.empty', styles: '' },
			];

			const css = manager.insertRules('body { margin: 0; }', rules);

			expect(manager.extractRules(css)).to.deep.equal(rules);
		});
	});
});
