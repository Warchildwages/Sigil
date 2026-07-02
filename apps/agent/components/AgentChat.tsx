'use client';

import { useState, useRef, useEffect } from 'react';
import type { LegalKnowledgeResponse } from '@signet/shared';

interface Message {
  role: 'user' | 'agent';
  content: string;
  response?: LegalKnowledgeResponse;
  timestamp: number;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content:
        "Hello. I'm the Signet Legal Clarity Agent — I provide directional guidance on legal structures, compliance, contracts, and regulatory considerations. I am not a lawyer and this is not legal advice. Ask me anything.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setLoading(true);

    const userMessage: Message = { role: 'user', content: query, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/api/agent/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = (await res.json()) as LegalKnowledgeResponse & { error?: string };

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: `Sorry, something went wrong: ${data.error}`, timestamp: Date.now() },
        ]);
      } else {
        const agentMessage: Message = {
          role: 'agent',
          content: data.guidance,
          response: data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: 'Sorry, I was unable to process your question. Please try again.', timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-white text-black'
                  : 'border border-white/10 bg-white/[0.04]'
              }`}
            >
              {msg.role === 'agent' ? (
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}

              {/* Response metadata */}
              {msg.response && (
                <div className="mt-3 space-y-3">
                  {/* Areas */}
                  {msg.response.areas.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wider">Key Legal Areas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.response.areas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-400"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {msg.response.nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wider">Next Steps</p>
                      <ol className="space-y-1">
                        {msg.response.nextSteps.map((step, j) => (
                          <li key={j} className="flex gap-2 text-xs text-white/60">
                            <span className="text-white/30 font-mono">{j + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Sources */}
                  {msg.response.sources.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wider">Sources</p>
                      {msg.response.sources.map((src, j) => (
                        <a
                          key={j}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-400/70 hover:text-blue-400/90 transition-colors truncate"
                        >
                          {src.title}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[10px] text-white/25 italic border-t border-white/5 pt-2 mt-2">
                    {msg.response.disclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about legal structures, compliance, contracts..."
            disabled={loading}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:border-amber-500/40 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white/60 transition-colors hover:border-amber-500/30 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-white/20 text-center">
          This is directional guidance only — not legal advice. Laws vary by jurisdiction. Consult a qualified attorney.
        </p>
      </div>
    </div>
  );
}