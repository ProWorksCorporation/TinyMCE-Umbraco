// Which element a newly inserted block is written as (PR #239, #224 problem 3). Since Umbraco 17.6 "Display inline" is
// a setting of the block type; the layout entry's `displayInline` is deprecated and no longer set for new blocks, so
// reading it wrote every block as <umb-rte-block>.
import { expect } from '@open-wc/testing';
import type { UmbBlockRteTypeModel } from '@umbraco-cms/backoffice/block-rte';
import { blockTagFor } from './block-tag.js';

const blockType = (contentElementTypeKey: string, displayInline: boolean) =>
	({ contentElementTypeKey, displayInline }) as UmbBlockRteTypeModel;

describe('blockTagFor', () => {
	const blockTypes = [blockType('inline-type', true), blockType('block-type', false)];

	it('writes a block whose type displays inline as <umb-rte-block-inline>', () => {
		expect(blockTagFor(blockTypes, 'inline-type')).to.equal('umb-rte-block-inline');
	});

	it('writes a block whose type does not display inline as <umb-rte-block>', () => {
		expect(blockTagFor(blockTypes, 'block-type')).to.equal('umb-rte-block');
	});

	it('falls back to <umb-rte-block> for a type that is not configured, or before the types have loaded', () => {
		expect(blockTagFor(blockTypes, 'unknown-type')).to.equal('umb-rte-block');
		expect(blockTagFor(undefined, 'inline-type')).to.equal('umb-rte-block');
	});
});
