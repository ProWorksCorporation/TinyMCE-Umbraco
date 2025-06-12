import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import { TinyMceService } from '../../api/index.js';

export async function createAiRequest(): Promise<(request: any, respondWith: any) => void> {
	const response = await TinyMceService.getConfig({ client: umbHttpClient });

	const apiKey = response.data?.config?.openAiApikey || '';

	return (request: any, respondWith: any) => {
		const openAiOptions = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				temperature: 0.7,
				max_tokens: 800,
				messages: [{ role: 'user', content: request.prompt }],
			}),
		};

		respondWith.string((signal: any) =>
			fetch('https://api.openai.com/v1/chat/completions', { signal, ...openAiOptions }).then(async (response) => {
				if (response) {
					const data = await response.json();
					if (!response.ok || data.error) {
						throw new Error(`${data?.error?.type}: ${data?.error?.message}`);
					}
					return data?.choices?.[0]?.message?.content?.trim() ?? '';
				} else {
					throw new Error('Failed to communicate with the ChatGPT API');
				}
			})
		);
	};
}
