// The ai_request handler against the real umbHttpClient, with fetch stubbed. umbHttpClient is created with
// `throwOnError: true` (unlike what the generated SDK's types suggest), so these cover the path a 502/503 really takes.
import { expect } from '@open-wc/testing';
import { umbLocalizationManager } from '@umbraco-cms/backoffice/localization-api';
import { createAiRequest } from './ai-request-factory.js';
import en from '../../localizations/en.js';

type Fetch = typeof window.fetch;

/** Runs one AI request through the handler and returns what TinyMCE would receive. */
async function runRequest(prompt: string, signal: AbortSignal = new AbortController().signal): Promise<string> {
	const handler = await createAiRequest();
	let producer: ((signal: AbortSignal) => Promise<string>) | undefined;
	handler({ prompt }, { string: (fn) => (producer = fn) });
	expect(producer, 'respondWith.string was called').to.exist;
	return producer!(signal);
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a rejection');
}

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createAiRequest', () => {
	let originalFetch: Fetch;
	let requests: Array<{ url: string; body: string }>;

	before(() => {
		// The English strings, flattened the way Umbraco's localization registry registers them.
		const flat: Record<string, string> = { $code: 'en', $dir: 'ltr' } as never;
		for (const [section, entries] of Object.entries(en)) {
			for (const [key, value] of Object.entries(entries as Record<string, string>)) flat[`${section}_${key}`] = value;
		}
		umbLocalizationManager.registerLocalization(flat as never);
	});

	beforeEach(() => {
		originalFetch = window.fetch;
		requests = [];
	});

	afterEach(() => {
		window.fetch = originalFetch;
	});

	function stubFetch(respond: (request: Request) => Response | Promise<Response>) {
		window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = input instanceof Request ? input : new Request(input, init);
			requests.push({ url: request.url, body: await request.clone().text() });
			return respond(request);
		}) as Fetch;
	}

	it('posts the prompt to the relay and returns its content', async () => {
		stubFetch(() => json(200, { content: 'Generated text.' }));

		expect(await runRequest('Write something')).to.equal('Generated text.');
		expect(requests).to.have.length(1);
		expect(requests[0].url).to.match(/\/umbraco\/management\/api\/v1\/tiny-mce\/ai\/completion$/);
		expect(JSON.parse(requests[0].body)).to.deep.equal({ prompt: 'Write something' });
	});

	it('never calls OpenAI from the browser', async () => {
		stubFetch(() => json(200, { content: 'x' }));
		await runRequest('Write something');
		expect(requests.some((r) => r.url.includes('openai.com'))).to.be.false;
	});

	it('shows the authentication message for a 502 with category "authentication"', async () => {
		stubFetch(() =>
			json(502, { type: 'ai-provider-error', title: 'The AI provider could not complete the request.', status: 502, category: 'authentication' }),
		);

		const error = (await rejectionOf(runRequest('x'))) as Error;
		expect(error).to.be.instanceOf(Error);
		expect(error.message).to.equal(en.tinyMce.aiError_authentication);
	});

	it('shows the rate-limited message for a 502 with category "rate-limited"', async () => {
		stubFetch(() => json(502, { type: 'ai-provider-error', title: 't', status: 502, category: 'rate-limited' }));

		const error = (await rejectionOf(runRequest('x'))) as Error;
		expect(error.message).to.equal(en.tinyMce.aiError_rateLimited);
	});

	it('shows the not-configured message for a 503', async () => {
		stubFetch(() => json(503, { type: 'ai-not-configured', title: 't', status: 503 }));

		const error = (await rejectionOf(runRequest('x'))) as Error;
		expect(error.message).to.equal(en.tinyMce.aiNotConfigured);
	});

	it('shows the unavailable message when the request never gets a response', async () => {
		stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

		const error = (await rejectionOf(runRequest('x'))) as Error;
		expect(error.message).to.equal(en.tinyMce.aiError_unavailable);
	});

	it('lets an abort stay an abort rather than becoming a message', async () => {
		const controller = new AbortController();
		stubFetch(
			(request) =>
				new Promise<Response>((_resolve, reject) => {
					const abort = () => reject(new DOMException('Aborted', 'AbortError'));
					if (request.signal.aborted) abort();
					else request.signal.addEventListener('abort', abort);
				}),
		);

		const pending = runRequest('x', controller.signal);
		controller.abort();
		const error = (await rejectionOf(pending)) as Error;
		expect(error.name).to.equal('AbortError');
	});
});
