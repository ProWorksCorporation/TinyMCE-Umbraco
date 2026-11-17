// Characterisation tests for the configuration-merge helpers: they assert today's behaviour. Cases marked
// "Surprise" are listed in specs/004-upgrade-umbraco-17-8/baseline.md.
import { expect } from '@open-wc/testing';
import { mergeArrays, parseJsonStringValues } from './input-tiny-mce.config-merge.js';

describe('mergeArrays', () => {
	it('unions two string arrays, in first-seen order', () => {
		expect(mergeArrays(['a', 'b'], ['b', 'c'])).to.deep.equal(['a', 'b', 'c']);
	});

	it('removes duplicates within a single array', () => {
		expect(mergeArrays(['a', 'a', 'b'], [])).to.deep.equal(['a', 'b']);
	});

	it('drops every non-string entry (the guard against TinyMCE crashing on construction)', () => {
		const withJunk: unknown[] = ['a', 1, null, undefined, true, { name: 'x' }, ['nested']];

		expect(mergeArrays(withJunk, ['b'])).to.deep.equal(['a', 'b']);
	});

	it('treats a single string as a one-item list', () => {
		expect(mergeArrays('a', ['b'])).to.deep.equal(['a', 'b']);
		expect(mergeArrays('a', 'a')).to.deep.equal(['a']);
	});

	it('treats undefined, null and non-array objects as empty', () => {
		expect(mergeArrays(undefined, undefined)).to.deep.equal([]);
		expect(mergeArrays(null, ['a'])).to.deep.equal(['a']);
		// What a real JSON array in Umbraco:CMS:RichTextEditor:CustomConfig arrives as: an index-keyed object.
		expect(mergeArrays({ 0: 'fullscreen' }, ['a'])).to.deep.equal(['a']);
		expect(mergeArrays(42, ['a'])).to.deep.equal(['a']);
	});

	it('keeps an empty string as a plugin name', () => {
		// Surprise: '' passes the string filter, so it reaches TinyMCE's plugin list.
		expect(mergeArrays('', ['a'])).to.deep.equal(['', 'a']);
	});
});

describe('parseJsonStringValues', () => {
	it('turns a JSON array string into an array', () => {
		expect(parseJsonStringValues({ plugins: '["fullscreen"]' })).to.deep.equal({ plugins: ['fullscreen'] });
	});

	it('turns a JSON object string into an object', () => {
		expect(parseJsonStringValues({ style: '{"title":"Lead","block":"p"}' })).to.deep.equal({
			style: { title: 'Lead', block: 'p' },
		});
	});

	it('leaves a string that only looks like JSON unchanged when it does not parse', () => {
		expect(parseJsonStringValues({ broken: '[not json' })).to.deep.equal({ broken: '[not json' });
	});

	it('leaves ordinary strings unchanged', () => {
		expect(parseJsonStringValues({ entity_encoding: 'raw', toolbar: 'fullscreen' })).to.deep.equal({
			entity_encoding: 'raw',
			toolbar: 'fullscreen',
		});
	});

	it('does not parse JSON with leading whitespace', () => {
		// Surprise: only strings *starting* with "[" or "{" are considered.
		expect(parseJsonStringValues({ plugins: ' ["x"]' })).to.deep.equal({ plugins: ' ["x"]' });
	});

	it('passes non-string values through by reference', () => {
		const nested = { inner: '["not parsed"]' };
		const list = ['a'];
		const result = parseJsonStringValues({ flag: true, count: 5, nested, list });

		expect(result.flag).to.equal(true);
		expect(result.count).to.equal(5);
		expect(result.nested).to.equal(nested);
		expect(result.list).to.equal(list);
		// Only top-level values are parsed.
		expect(nested.inner).to.equal('["not parsed"]');
	});

	it('returns a new object and leaves its input unchanged', () => {
		const input = { plugins: '["fullscreen"]' };
		const result = parseJsonStringValues(input);

		expect(result).to.not.equal(input);
		expect(input.plugins).to.equal('["fullscreen"]');
	});
});
