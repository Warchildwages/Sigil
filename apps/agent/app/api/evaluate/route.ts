import { NextResponse } from 'next/server';
import { discoverAgents, evaluateAllAgents, evaluateAgent } from '../../../lib/agent-evaluator';

/**
 * GET /api/evaluate — Discover and list all swarm agents
 */
export async function GET() {
  const agents = await discoverAgents();
  return NextResponse.json({
    sigil: 'Agent Discovery & Evaluation Engine',
    discovered: agents.length,
    agents,
    message: agents.length > 0
      ? `Discovered ${agents.length} agent(s). POST to /api/evaluate to run full evaluation.`
      : 'No swarm agents discovered. Ensure MCP registration is active.',
  });
}

/**
 * POST /api/evaluate — Run full evaluation of all discovered agents
 */
export async function POST() {
  const result = await evaluateAllAgents();
  return NextResponse.json({
    sigil: 'Agent Evaluation Complete',
    ...result,
  });
}
