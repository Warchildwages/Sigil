import { NextResponse } from 'next/server';
import { discoverAgents } from '../../../lib/discovery';
import { verifyAgent } from '../../../lib/verification';
import { evaluateAgent } from '../../../lib/evaluator';
import { aggregateReputation, getWarnings } from '../../../lib/reputation';
import { buildDidNostrDoc } from '../../../lib/did-nostr';
import type { AgentProfile } from '../../../lib/types';

/**
 * POST /api/evaluate — Evaluate all known agents and return ranked results
 *
 * This is the main entry point for foreign agents.
 * "Vera, who should I trust for this task?"
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const capability = (body.capability as string) ?? undefined;

  const agents = capability
    ? (await discoverAgents()).filter((a) =>
        a.capabilities.some((c) => c.toLowerCase().includes(capability.toLowerCase())),
      )
    : await discoverAgents();

  const profiles: AgentProfile[] = [];

  for (const agent of agents) {
    const verification = await verifyAgent(agent);
    const evaluation = verification.keyValid
      ? await evaluateAgent(agent, verification)
      : null;
    const reputation = aggregateReputation(agent.agentId);
    const warnings = getWarnings(agent.agentId);

    profiles.push({
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      chains: agent.chains,
      didNostrUrl: agent.didNostrUrl,
      verification,
      evaluation,
      reputation,
      warnings,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Rank by evaluation score
  const ranked = profiles.sort(
    (a, b) => (b.evaluation?.overall ?? 0) - (a.evaluation?.overall ?? 0),
  );

  const didDoc = buildDidNostrDoc(agents);

  return NextResponse.json({
    vera: 'Agent Evaluation Complete',
    query: capability ? `agents matching "${capability}"` : 'all agents',
    count: ranked.length,
    rankings: ranked.map((p) => ({
      name: p.name,
      score: p.evaluation?.overall ?? 0,
      warnings: p.warnings,
    })),
    agents: ranked,
    didDoc,
  });
}

/**
 * GET /api/evaluate — Quick summary
 */
export async function GET() {
  const agents = await discoverAgents();

  return NextResponse.json({
    vera: 'Agent Evaluation Engine',
    description:
      'POST to this endpoint to run full evaluation. ' +
      'Optional body: { "capability": "events" } to filter by capability.',
    discovered: agents.length,
    agents: agents.map((a) => ({ id: a.agentId, name: a.name, capabilities: a.capabilities })),
  });
}
