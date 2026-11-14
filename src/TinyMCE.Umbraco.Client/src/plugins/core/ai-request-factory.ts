import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import { TinyMceService } from '../../api/index.js';
import { aiErrorTermKey } from './ai-error-term.js';
import { aiTerm } from './ai-localize.js';

/** The part of TinyMCE's AI plugin request this handler uses. */
interface AiRequest {
	prompt: string;
}

/** The part of TinyMCE's AI plugin `respondWith` this handler uses. */
interface AiRespondWith {
	string(fn: (signal: AbortSignal) => Promise<string>): void;
}

/**
 * Creates TinyMCE's `ai_request` handler. Each request goes to this package's backoffice-only relay
 * (`POST /umbraco/management/api/v1/tiny-mce/ai/completion`), which calls the AI provider from the server, so the
 * provider key never reaches the browser (CL-001). Failures become a localized, actionable message; provider text
 * is never shown.
 * @returns {Promise<(request: AiRequest, respondWith: AiRespondWith) => void>} the `ai_request` handler.
 */
export async function createAiRequest(): Promise<(request: AiRequest, respondWith: AiRespondWith) => void> {
	return (request: AiRequest, respondWith: AiRespondWith) => {
		respondWith.string(async (signal: AbortSignal) => {
			let result: Awaited<ReturnType<typeof TinyMceService.postAiCompletion>>;
			try {
				result = await TinyMceService.postAiCompletion({
					client: umbHttpClient,
					body: { prompt: request.prompt },
					signal,
					// umbHttpClient is created with `throwOnError: true`, which would throw the error body and lose the
					// HTTP status. Ask for the result object instead, so the status and category can be mapped.
					throwOnError: false,
				});
			} catch (error) {
				// An abort (the editor closed the dialog or cancelled) must stay an abort, not become a message.
				if (signal.aborted) throw error;
				throw new Error(aiTerm(aiErrorTermKey({})));
			}

			// An abort also arrives here as a returned error, without a response.
			if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');

			if (result.data) return result.data.content;

			const status = result.response?.status;
			const problem = result.error as { category?: unknown } | undefined;
			const category = typeof problem?.category === 'string' ? problem.category : undefined;
			throw new Error(aiTerm(aiErrorTermKey({ status, category })));
		});
	};
}
