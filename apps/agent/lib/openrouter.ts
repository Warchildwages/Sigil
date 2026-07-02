/**
 * OpenRouter Provider Module
 *
 * OpenAI-compatible API for accessing 200+ models through OpenRouter.
 * Uses credits-based billing — no free tier, but pay-as-you-go.
 *
 * Model: meta-llama/llama-3.2-3b-instruct (same as what Groq uses)
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 */

export interface OpenRouterConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

/**
 * Return OpenRouter API config from env vars.
 * OpenAI-compatible /chat/completions endpoint.
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct';

  return {
    apiKey,
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model,
  };
}
