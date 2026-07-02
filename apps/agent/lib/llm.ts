/**
 * LLM Provider Configuration
 *
 * Priority: Venice (Base-native) → Google Gemini (free) → OpenRouter (credits) → Groq (free) → OpenAI (paid)
 * All use OpenAI-compatible `/chat/completions` API.
 *
 * Free tier limits:
 *   Venice: Privacy-focused, free tier available
 *   Google Gemini: 1,500 requests/day (gemini-2.0-flash-lite, free tier)
 *   OpenRouter: Credits-based, pay-as-you-go
 *   Groq: 30 requests/minute (llama-3.2-3b, free tier)
 *   OpenAI: Paid only (gpt-4o-mini, ~$0.15/1M input tokens)
 */

export interface LlmConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  provider: 'google' | 'groq' | 'openai' | 'openrouter' | 'venice' | 'none';
  /** Extra headers required by provider */
  headers: Record<string, string>;
  /** Human-readable reason when provider is 'none' */
  reason?: string;
}

/**
 * Returns the best available LLM configuration.
 * Checks env vars in priority order: Venice → Gemini → OpenRouter → Groq → OpenAI.
 */
export function getLlmConfig(): LlmConfig {
  // Venice — Base-native, privacy-focused, OpenAI-compatible
  const veniceKey = process.env.VENICE_API_KEY;
  if (veniceKey) {
    return {
      apiKey: veniceKey,
      apiUrl: 'https://api.venice.ai/v1/chat/completions',
      model: 'llama-3.2-3b',
      provider: 'venice',
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://signet.ventures',
        'X-Title': 'Signet Legal Clarity Agent (Sigil)',
      },
    };
  }

  // Google Gemini — free tier, 1,500 req/day, v1beta OpenAI-compatible endpoint
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      apiKey: geminiKey,
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-2.0-flash-lite',
      provider: 'google',
      headers: {},
    };
  }

  // OpenRouter — credits-based, 200+ models, OpenAI-compatible
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct';
    return {
      apiKey: openRouterKey,
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      model,
      provider: 'openrouter',
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://signet.ventures',
        'X-Title': 'Signet Legal Clarity Agent (Sigil)',
      },
    };
  }

  // Groq — free tier, fastest LPU inference
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      apiKey: groqKey,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.2-3b-preview',
      provider: 'groq',
      headers: {},
    };
  }

  // OpenAI — paid, gpt-4o-mini
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      provider: 'openai',
      headers: {},
    };
  }

  return {
    apiKey: '',
    apiUrl: '',
    model: 'none',
    provider: 'none',
    headers: {},
    reason:
      'No LLM API key configured. Set VENICE_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in .env.',
  };
}

/**
 * One-liner: get model string for logging.
 */
export function getLlmModelName(): string {
  const config = getLlmConfig();
  return config.model;
}
