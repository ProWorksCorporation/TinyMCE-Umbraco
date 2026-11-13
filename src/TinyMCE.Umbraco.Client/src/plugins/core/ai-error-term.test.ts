// How the AI relay's error responses map to localization keys (contracts/ai-completion.md, "Frontend mapping").
import { expect } from '@open-wc/testing';
import { aiErrorTermKey } from './ai-error-term.js';

describe('aiErrorTermKey', () => {
	it('maps 503 (not configured) to tinyMce_aiNotConfigured', () => {
		expect(aiErrorTermKey({ status: 503 })).to.equal('tinyMce_aiNotConfigured');
	});

	const categories: Array<[string, string]> = [
		['authentication', 'tinyMce_aiError_authentication'],
		['rate-limited', 'tinyMce_aiError_rateLimited'],
		['quota-exceeded', 'tinyMce_aiError_quotaExceeded'],
		['invalid-request', 'tinyMce_aiError_invalidRequest'],
		['unavailable', 'tinyMce_aiError_unavailable'],
		['timeout', 'tinyMce_aiError_timeout'],
		['unknown', 'tinyMce_aiError_unknown'],
	];
	for (const [category, key] of categories) {
		it(`maps 502 with category "${category}" to ${key}`, () => {
			expect(aiErrorTermKey({ status: 502, category })).to.equal(key);
		});
	}

	it('maps 502 with an unrecognised category to tinyMce_aiError_unknown', () => {
		expect(aiErrorTermKey({ status: 502, category: 'something-new' })).to.equal('tinyMce_aiError_unknown');
	});

	it('maps 502 without a category to tinyMce_aiError_unknown', () => {
		expect(aiErrorTermKey({ status: 502 })).to.equal('tinyMce_aiError_unknown');
	});

	it('does not turn an inherited property name into a key', () => {
		expect(aiErrorTermKey({ status: 502, category: 'constructor' })).to.equal('tinyMce_aiError_unknown');
	});

	it('maps 400 to tinyMce_aiError_invalidRequest', () => {
		expect(aiErrorTermKey({ status: 400 })).to.equal('tinyMce_aiError_invalidRequest');
	});

	it('maps no status (network failure) to tinyMce_aiError_unavailable', () => {
		expect(aiErrorTermKey({})).to.equal('tinyMce_aiError_unavailable');
		expect(aiErrorTermKey({ status: undefined })).to.equal('tinyMce_aiError_unavailable');
	});

	it('maps any other status to tinyMce_aiError_unknown', () => {
		for (const status of [401, 403, 404, 500, 504]) {
			expect(aiErrorTermKey({ status }), String(status)).to.equal('tinyMce_aiError_unknown');
		}
	});
});
