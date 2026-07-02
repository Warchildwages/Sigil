import type { LegalKnowledgeRequest, LegalKnowledgeResponse, LegalKnowledgeSource } from '@sigil/shared';
import { buildKnowledgePrompt } from '@/app/api/agent/analyze/prompts.js';
import { getLlmConfig } from '@/lib/llm.js';

interface RawKnowledgeResult {
	guidance: string;
	areas: string[];
	nextSteps: string[];
	sources: RawKnowledgeSource[];
	disclaimer: string;
}

interface RawKnowledgeSource {
	title: string;
	url: string;
	snippet: string;
	relevance: string;
}

const DEFAULT_DISCLAIMER =
	'This is directional guidance only, not legal advice. Laws vary by jurisdiction. Consult a qualified attorney before making legal decisions. Signet provides document analysis and attestation services — not legal representation.';

/**
 * Synthesizes legal knowledge from the LLM based on a natural language query.
 * Uses centralized LLM provider config (OpenRouter → Groq → OpenAI).
 * Always appends the mandatory disclaimer.
 *
 * Phase 3 — Legal Clarity Agent for Circle Marketplace.
 */
export async function synthesizeLegalKnowledge(
	request: LegalKnowledgeRequest,
): Promise<LegalKnowledgeResponse> {
	const startTime = Date.now();

	// Build the prompt
	const prompt = buildKnowledgePrompt(request.query, request.jurisdiction, request.entityType);

	// Call LLM via centralized provider config
	const llm = getLlmConfig();

	if (llm.provider === 'none') {
		// Graceful fallback — return structured response without LLM
		return {
			responseId: `knowledge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
			query: request.query,
			guidance:
				'To answer this question, I would need to consult current legal resources. Please try again when the AI service is available, or consult a qualified attorney for guidance specific to your situation.',
			areas: [],
			nextSteps: ['Consult a qualified attorney for jurisdiction-specific guidance', 'Try again later when the AI service is available'],
			sources: [],
			disclaimer: DEFAULT_DISCLAIMER,
			generatedAt: new Date().toISOString(),
			processingTimeMs: Date.now() - startTime,
		};
	}

	try {
		const res = await fetch(llm.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${llm.apiKey}`,
				...llm.headers,
			},
			body: JSON.stringify({
				model: llm.model,
				messages: [
					{
						role: 'system',
						content:
							'You are a legal clarity assistant. Return ONLY valid JSON with comprehensive, directional guidance. Never provide specific legal advice.',
					},
					{ role: 'user', content: prompt },
				],
				temperature: 0.4,
				max_tokens: 2000,
			}),
		});

		if (res.ok) {
			const data = await res.json();
			const content = data.choices?.[0]?.message?.content;
			if (content) {
				const parsed = JSON.parse(content) as RawKnowledgeResult;

				// Sanitize sources
				const sources: LegalKnowledgeSource[] = Array.isArray(parsed.sources)
					? parsed.sources.map((s) => ({
							title: String(s.title || ''),
							url: String(s.url || ''),
							snippet: String(s.snippet || ''),
							relevance: ['high', 'medium', 'low'].includes(String(s.relevance))
								? (String(s.relevance) as LegalKnowledgeSource['relevance'])
								: 'medium',
						}))
					: [];

				return {
					responseId: `knowledge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
					query: request.query,
					guidance: String(parsed.guidance || ''),
					areas: Array.isArray(parsed.areas) ? parsed.areas.map(String) : [],
					nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
					sources,
					disclaimer: String(parsed.disclaimer || DEFAULT_DISCLAIMER),
					generatedAt: new Date().toISOString(),
					processingTimeMs: Date.now() - startTime,
				};
			}
		} else {
			console.error(`${llm.provider} knowledge API error:`, res.status);
		}
	} catch (err) {
		console.error('Legal knowledge LLM error:', err);
	}

	// Fallback on LLM failure
	return {
		responseId: `knowledge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		query: request.query,
		guidance:
			'I was unable to synthesize guidance for this query. Please try again or consult a qualified attorney.',
		areas: [],
		nextSteps: ['Try again later', 'Consult a qualified attorney'],
		sources: [],
		disclaimer: DEFAULT_DISCLAIMER,
		generatedAt: new Date().toISOString(),
		processingTimeMs: Date.now() - startTime,
	};
}