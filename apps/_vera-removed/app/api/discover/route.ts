import { NextResponse } from 'next/server';
import { discoverAgents, discoverByCapability } from '../../../lib/discovery';

/**
 * GET /api/discover — List all agents
 * GET /api/discover?capability=events — Filter by capability
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const capability = url.searchParams.get('capability');

  const agents = capability
    ? await discoverByCapability(capability)
    : await discoverAgents();

  return NextResponse.json({
    vera: 'Agent Discovery',
    count: agents.length,
    agents: agents.map((a) => ({
      id: a.agentId,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
      chains: a.chains,
    })),
    query: capability ? { capability } : undefined,
  });
}
