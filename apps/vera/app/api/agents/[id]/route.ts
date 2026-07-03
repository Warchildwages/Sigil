import { NextResponse } from 'next/server';
import { getAgent, discoverAgents } from '../../../lib/discovery';
import { verifyAgent } from '../../../lib/verification';
import { evaluateAgent } from '../../../lib/evaluator';
import { aggregateReputation, getWarnings } from '../../../lib/reputation';
import type { AgentProfile } from '../../../lib/types';

/**
 * GET /api/agents/:id — Get full profile for a specific agent
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const agent = await getAgent(params.id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Run verification
  const verification = await verifyAgent(agent);

  // Run evaluation (if basic verification passes)
  const evaluation = verification.keyValid
    ? await evaluateAgent(agent, verification)
    : null;

  // Aggregate reputation
  const reputation = aggregateReputation(agent.agentId);
  const warnings = getWarnings(agent.agentId);

  const profile: AgentProfile = {
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
  };

  return NextResponse.json(profile);
}
