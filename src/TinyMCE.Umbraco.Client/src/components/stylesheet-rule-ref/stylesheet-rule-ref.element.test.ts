// Harness proof for the in-browser test setup (research R13): a real element of this package, importing from
// @umbraco-cms/backoffice, is defined, upgraded and rendered by Chromium under @web/test-runner.
import { expect, fixture, html } from '@open-wc/testing';
import { UmbStylesheetRuleRefElement } from './stylesheet-rule-ref.element.js';

describe('UmbStylesheetRuleRefElement', () => {
	it('is defined as umb-stylesheet-rule-ref', () => {
		expect(customElements.get('umb-stylesheet-rule-ref')).to.equal(UmbStylesheetRuleRefElement);
	});

	it('renders its name and detail', async () => {
		const element = await fixture<UmbStylesheetRuleRefElement>(
			html`<umb-stylesheet-rule-ref name="Heading two" detail="h2.lead"></umb-stylesheet-rule-ref>`,
		);

		expect(element).to.be.instanceOf(UmbStylesheetRuleRefElement);
		expect(element.name).to.equal('Heading two');
		expect(element.detail).to.equal('h2.lead');

		const text = element.shadowRoot?.textContent ?? '';
		expect(text).to.contain('Heading two');
		expect(text).to.contain('h2.lead');
	});

	it('passes its own fallback icon to uui-icon when no icon is slotted', async () => {
		const element = await fixture<UmbStylesheetRuleRefElement>(
			html`<umb-stylesheet-rule-ref name="Heading two"></umb-stylesheet-rule-ref>`,
		);

		// UUIRefNodeElement renders `fallbackIcon` as <uui-icon .svg=…>. The override is the "braces" glyph; UUI's
		// default fallback icon is a different path.
		const icon = element.shadowRoot?.querySelector<HTMLElement & { svg?: string }>('uui-icon') ?? null;
		expect(icon !== null, 'uui-icon rendered').to.be.true;
		expect(icon?.svg ?? '').to.contain('M8 3H7a2 2 0 0 0-2 2v5');
	});
});
