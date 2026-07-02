/**
 * Venice AI Provider — Private, Base-native LLM inference
 *
 * Venice is a privacy-focused, OpenAI-compatible AI API.
 * It's listed as a Base MCP native plugin alongside Uniswap, Aerodrome, etc.
 *
 * Auth: Bearer token (API key) — same pattern as all other providers.
 * Endpoint: https://api.venice.ai/v1/chat/completions
 *
 * Source: https://docs.base.org/agents/plugins/native/venice
 * Plugin spec: https://github.com/base/skills/blob/master/skills/base-mcp/plugins/venice.md
 */

import type { LlmConfig } from './llm.js';

/**
 * Returns Venice LLM config if VENICE_API_KEY is set, null otherwise.
 * Venice is Base-native and privacy-focused — ideal first-choice provider.
 */
export function getVeniceConfig(): LlmConfig | null {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    apiUrl: 'https://api.venice.ai/v1/chat/completions',
    model: 'llama-3.2-3b-instruct',
    provider: 'venice',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://signet.ventures',
      'X-Title': 'Signet Legal Clarity Agent (Sigil)',
    },
  };
}

/**
 * Checks if Venice is available (API key is configured).
 */
export function isVeniceAvailable(): boolean {
  return Boolean(process.env.VENICE_API_KEY);
}

/**
 * Parses Retry-After header from Venice rate-limit responses.
 * Venice enforces rate limits with ~15s retry windows (observed via OpenRouter upstream).
 * Returns milliseconds to wait before retry, defaulting to 15000ms.
 */
export function handleVeniceRateLimit(retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number.parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
    // Try HTTP-date format
    const date = Date.parse(retryAfterHeader);
    if (!Number.isNaN(date)) {
      return Math.max(0, date - Date.now());
    }
  }
  // Default: 15s (observed Venice rate limit via OpenRouter)
  return 15_000;
}
