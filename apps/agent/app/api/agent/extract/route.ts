import { NextResponse } from 'next/server';
import type { ContractModel, ExtractionResponse } from '@sigil/shared';
import { detectDocumentContext } from '../analyze/detector.js';
import { buildExtractionPrompt } from '../analyze/prompts.js';
import { getLlmConfig } from '@/lib/llm.js';

/**
 * POST /api/agent/extract
 *
 * Extracts a structured ContractModel from document text via LLM,
 * and optionally renders it as an SVG flowchart.
 * The professional reviews before attesting — AI proposes, human disposes.
 *
 * Body: { documentText: string, format?: 'json' | 'svg' | 'both' }
 * Returns: { extractionId, contractModel, svg?, modelUsed, processingTimeMs, generatedAt }
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const documentText = typeof body.documentText === 'string' ? body.documentText : '';
    const format = (typeof body.format === 'string' ? body.format : 'both') as 'json' | 'svg' | 'both';

    if (!documentText) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { documentText: ['Required'] } } },
        { status: 400 },
      );
    }

    const trimmedText = documentText.slice(0, 12000);
    const detectedContext = detectDocumentContext(trimmedText);
    const prompt = buildExtractionPrompt(trimmedText, detectedContext);

    const llm = getLlmConfig();
    let modelUsed = llm.model;
    let contractModel: ContractModel | null = null;

    if (llm.provider !== 'none') {

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
              { role: 'system', content: 'You are a contract structure extractor. Return ONLY valid JSON. No explanations.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 2000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = parseExtractionResult(content);
            contractModel = sanitizeContractModel(parsed);
          }
        } else {
          console.error(`${llm.provider} extraction API error:`, res.status);
        }
      } catch (err) {
        console.error('Extraction LLM call error:', err);
      }
    }

    if (!contractModel) {
      contractModel = buildFallbackModel(trimmedText, detectedContext);
      modelUsed = 'none';
    }

    let svg: string | undefined;
    if (format === 'svg' || format === 'both') {
      svg = contractModelToSVG(contractModel);
    }

    const processingTimeMs = Date.now() - startTime;

    const response: ExtractionResponse = {
      extractionId: `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      contractModel,
      svg,
      modelUsed,
      processingTimeMs,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/agent/extract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseExtractionResult(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
    return { title: 'Untitled Document', parties: [], obligations: [], conditions: [], assets: [], timeline: [] };
  }
}

function sanitizeContractModel(raw: Record<string, unknown>): ContractModel {
  const validRoles = new Set(['signer', 'counterparty', 'beneficiary', 'witness', 'trustee', 'executor', 'agent', 'lender', 'borrower']);
  const validObligationTypes = new Set(['payment', 'delivery', 'service', 'restriction', 'disclosure']);
  const validConditionTypes = new Set(['time-gate', 'event', 'threshold']);
  const validAssetTypes = new Set(['usdc', 'property', 'rights', 'tokens', 'other']);

  const parties = (Array.isArray(raw.parties) ? raw.parties : []).map((p: unknown, i: number) => {
    const party = (p as Record<string, unknown>) ?? {};
    return {
      id: String(party.id || `p${i + 1}`),
      name: String(party.name || `Party ${i + 1}`),
      role: validRoles.has(String(party.role)) ? String(party.role) as ContractModel['parties'][number]['role'] : 'signer',
      walletAddress: (party.walletAddress as string | null) ?? null,
    };
  });

  const obligations = (Array.isArray(raw.obligations) ? raw.obligations : []).map((o: unknown) => {
    const obl = (o as Record<string, unknown>) ?? {};
    return {
      from: String(obl.from || 'p1'),
      to: String(obl.to || 'p2'),
      description: String(obl.description || ''),
      type: validObligationTypes.has(String(obl.type)) ? String(obl.type) as ContractModel['obligations'][number]['type'] : 'delivery',
    };
  });

  const conditions = (Array.isArray(raw.conditions) ? raw.conditions : []).map((c: unknown) => {
    const cond = (c as Record<string, unknown>) ?? {};
    return {
      description: String(cond.description || ''),
      trigger: String(cond.trigger || ''),
      outcome: String(cond.outcome || ''),
      type: validConditionTypes.has(String(cond.type)) ? String(cond.type) as ContractModel['conditions'][number]['type'] : 'event',
    };
  });

  const assets = (Array.isArray(raw.assets) ? raw.assets : []).map((a: unknown) => {
    const asset = (a as Record<string, unknown>) ?? {};
    return {
      description: String(asset.description || ''),
      type: validAssetTypes.has(String(asset.type)) ? String(asset.type) as ContractModel['assets'][number]['type'] : 'other',
      amount: (asset.amount as string | null) ?? null,
      beneficiary: String(asset.beneficiary || 'p2'),
    };
  });

  const timeline = (Array.isArray(raw.timeline) ? raw.timeline : []).map((t: unknown) => {
    const evt = (t as Record<string, unknown>) ?? {};
    return {
      event: String(evt.event || ''),
      date: (evt.date as string | null) ?? null,
      relativeDays: typeof evt.relativeDays === 'number' ? evt.relativeDays : null,
      description: String(evt.description || ''),
    };
  });

  return {
    title: String(raw.title || 'Untitled Document'),
    parties,
    obligations,
    conditions,
    assets,
    timeline,
  };
}

function buildFallbackModel(text: string, _context: string): ContractModel {
  const title = text.slice(0, 80).replace(/\n/g, ' ').trim() || 'Untitled Document';

  const parties: ContractModel['parties'] = [];
  const signerMatch = text.match(/(?:I|we),\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (signerMatch) {
    parties.push({ id: 'p1', name: `${signerMatch[1]} (Signer)`, role: 'signer', walletAddress: null });
  }

  const counterpartyMatch = text.match(/(?:between|by and between)\s+(?:[^,]+?)\s+and\s+([^,]+?)(?:,|\s+dated|\s+this)/i);
  if (counterpartyMatch?.[1]) {
    parties.push({ id: 'p2', name: `${counterpartyMatch[1].trim()} (Counterparty)`, role: 'counterparty', walletAddress: null });
  }

  if (parties.length === 0) {
    parties.push({ id: 'p1', name: 'Party 1', role: 'signer', walletAddress: null });
  }

  return {
    title,
    parties,
    obligations: [],
    conditions: [],
    assets: [],
    timeline: [],
  };
}

/* ── SVG Generation ── */

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function contractModelToSVG(model: ContractModel): string {
  const AC = '#f0a545';
  const GR = '#4ade80';
  const TX = '#e4e4ec';
  const TXD = '#6b6f82';

  const PARTY_W = 220;
  const PARTY_H = 64;
  const PARTY_GAP = 40;
  const PAD = 80;
  const SVG_W = Math.max(800, (model.parties.length * (PARTY_W + PARTY_GAP)) + PAD * 2);
  const OBL_Y = 200;
  const OBL_H = 72;
  const COND_Y = OBL_Y + (model.obligations.length * OBL_H) + 30;
  const COND_H = 56;
  const ASSETS_Y = COND_Y + (model.conditions.length * COND_H) + 30;
  const ASSETS_H = 40;
  const TL_Y = ASSETS_Y + (model.assets.length * ASSETS_H) + 30;
  const TL_H = 36;
  const SVG_H = TL_Y + (model.timeline.length * TL_H) + 60;

  const titleLine = `<text x="${SVG_W / 2}" y="44" text-anchor="middle" fill="${AC}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600">${xmlEscape(model.title)}</text>`;

  // Parties
  const totalW = model.parties.length * PARTY_W + (model.parties.length - 1) * PARTY_GAP;
  const startX = (SVG_W - totalW) / 2;
  const partyRects = model.parties.map((p, i) => {
    const x = startX + i * (PARTY_W + PARTY_GAP);
    const y = 90;
    return [
      `<rect x="${x}" y="${y}" width="${PARTY_W}" height="${PARTY_H}" rx="10" fill="none" stroke="${AC}" stroke-opacity="0.35" stroke-width="1.5"/>`,
      `<text x="${x + PARTY_W / 2}" y="${y + 24}" text-anchor="middle" fill="${TX}" font-family="Inter, system-ui, sans-serif" font-size="13">${xmlEscape(p.name)}</text>`,
      `<text x="${x + PARTY_W / 2}" y="${y + 46}" text-anchor="middle" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="10">${xmlEscape(p.role)}</text>`,
    ].join('\n    ');
  }).join('');

  // Obligations
  const obligationRects = model.obligations.map((o, i) => {
    const y = OBL_Y + i * OBL_H;
    const fromParty = model.parties.find((p) => p.id === o.from);
    const toParty = model.parties.find((p) => p.id === o.to);
    const label = `${fromParty?.name ?? o.from} → ${toParty?.name ?? o.to}`;
    return [
      `<text x="${SVG_W / 2}" y="${y}" text-anchor="middle" fill="${TX}" font-family="Inter, system-ui, sans-serif" font-size="12">${xmlEscape(o.description)}</text>`,
      `<text x="${SVG_W / 2}" y="${y + 20}" text-anchor="middle" fill="${GR}" font-family="JetBrains Mono, monospace" font-size="9">${o.type} · ${xmlEscape(label)}</text>`,
      `<line x1="${SVG_W / 2 - 120}" y1="${y + 32}" x2="${SVG_W / 2 + 120}" y2="${y + 32}" stroke="${AC}" stroke-opacity="0.1" stroke-width="1"/>`,
    ].join('\n    ');
  }).join('');

  // Conditions (diamond)
  const conditionRects = model.conditions.map((c, i) => {
    const y = COND_Y + i * COND_H;
    return [
      `<polygon points="${SVG_W / 2},${y - 8} ${SVG_W / 2 + 70},${y + 14} ${SVG_W / 2},${y + 36} ${SVG_W / 2 - 70},${y + 14}" fill="none" stroke="${AC}" stroke-opacity="0.25" stroke-width="1"/>`,
      `<text x="${SVG_W / 2}" y="${y + 10}" text-anchor="middle" fill="${TX}" font-family="Inter, system-ui, sans-serif" font-size="10">IF ${xmlEscape(c.trigger)}</text>`,
      `<text x="${SVG_W / 2}" y="${y + 30}" text-anchor="middle" fill="${GR}" font-family="Inter, system-ui, sans-serif" font-size="9">THEN ${xmlEscape(c.outcome)}</text>`,
    ].join('\n    ');
  }).join('');

  // Assets
  const assetRects = model.assets.map((a) => {
    const y = ASSETS_Y + model.assets.indexOf(a) * ASSETS_H;
    const beneficiary = model.parties.find((p) => p.id === a.beneficiary);
    const amountStr = a.amount ? ` · ${a.amount}` : '';
    return `<text x="${SVG_W / 2}" y="${y + 16}" text-anchor="middle" fill="${TXD}" font-family="Inter, system-ui, sans-serif" font-size="11">${xmlEscape(a.description)}${amountStr} → ${xmlEscape(beneficiary?.name ?? a.beneficiary)}</text>`;
  }).join('\n    ');

  // Timeline
  const timelineRects = model.timeline.map((t) => {
    const y = TL_Y + model.timeline.indexOf(t) * TL_H;
    const dateStr = t.date ? ` · ${t.date}` : t.relativeDays ? ` · Day ${t.relativeDays}` : '';
    return `<text x="${SVG_W / 2}" y="${y + 16}" text-anchor="middle" fill="${TXD}" font-family="Inter, system-ui, sans-serif" font-size="10">${xmlEscape(t.event)}${dateStr}</text>`;
  }).join('\n    ');

  // Section labels
  const labels: string[] = [];
  if (model.obligations.length > 0) labels.push(`<text x="${PAD}" y="${OBL_Y - 12}" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="9">OBLIGATIONS</text>`);
  if (model.conditions.length > 0) labels.push(`<text x="${PAD}" y="${COND_Y - 12}" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="9">CONDITIONS</text>`);
  if (model.assets.length > 0) labels.push(`<text x="${PAD}" y="${ASSETS_Y - 12}" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="9">ASSETS</text>`);
  if (model.timeline.length > 0) labels.push(`<text x="${PAD}" y="${TL_Y - 12}" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="9">TIMELINE</text>`);

  const metadataJson = JSON.stringify(model);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a14"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
  </defs>
  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#bgGrad)"/>
  <metadata>${xmlEscape(metadataJson)}</metadata>
  ${titleLine}
  ${labels.join('\n  ')}
  ${partyRects}
  ${obligationRects}
  ${conditionRects}
  ${assetRects}
  ${timelineRects}
  <text x="${SVG_W / 2}" y="${SVG_H - 16}" text-anchor="middle" fill="${TXD}" font-family="JetBrains Mono, monospace" font-size="8">Signet — The chain is the witness</text>
</svg>`;

  return svg;
}