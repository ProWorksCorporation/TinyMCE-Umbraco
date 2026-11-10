// Characterisation tests for scaleToMaxSize: they assert today's results, including the unrounded dimensions that
// the caller (sizeImageInEditor) rounds itself.
import { expect } from '@open-wc/testing';
import { scaleToMaxSize } from './index.js';

describe('scaleToMaxSize', () => {
	it('scales a landscape image down to the max width, keeping the aspect ratio', () => {
		expect(scaleToMaxSize(500, 1000, 500)).to.deep.equal({ width: 500, height: 250 });
	});

	it('scales a portrait image down to the max height, keeping the aspect ratio', () => {
		expect(scaleToMaxSize(500, 500, 1000)).to.deep.equal({ width: 250, height: 500 });
	});

	it('scales a square image down to max x max', () => {
		expect(scaleToMaxSize(500, 800, 800)).to.deep.equal({ width: 500, height: 500 });
	});

	it('leaves an image already smaller than the max unchanged', () => {
		expect(scaleToMaxSize(500, 300, 200)).to.deep.equal({ width: 300, height: 200 });
	});

	it('leaves an image of exactly the max size unchanged', () => {
		expect(scaleToMaxSize(500, 500, 500)).to.deep.equal({ width: 500, height: 500 });
	});

	it('applies the height limit after the width limit, and returns unrounded values', () => {
		// 1000x3000 -> width step: 500x1500 -> height step: (500/3)x500.
		const result = scaleToMaxSize(500, 1000, 3000);

		expect(result.height).to.equal(500);
		expect(result.width).to.be.closeTo(166.6667, 0.0001);
	});
});
