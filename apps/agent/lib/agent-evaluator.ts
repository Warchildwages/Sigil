/**
 * Sigil Agent Discovery & Evaluation Engine
 *
 * Sigil discovers swarm agents via MCP/service-info, then evaluates each one
 * by sending test payloads and scoring responses. Results are published
 * to did:nostr for portable reputation.
 */

export interface AgentDiscovery {
  name: string;
  service: string;
  endpoint: string;
  operations: string[];
  identity: string;  // e.g. "compliance.cspr"
  discoveredAt: string;
}

export interface EvaluationResult {
  agentName: string;
  agentEndpoint: string;
  agentIdentity: string;
  testedOperations: { name: string; passed: boolean; latencyMs: number; detail?: string }[];
  overallScore: number; // 0-100
  capabilityScore: number; // 0-100
  reliabilityScore: number; // 0-100
  issues: string[];
  strengths: string[];
  evaluatedAt: string;
}

const SWARM_AGENTS: AgentDiscovery[] = [
  {
    name: 'Compliance ⚖️',
    service: 'AML/KYC, sanctions screening, jurisdiction risk',
    endpoint: '/api/x402',
    operations: ['screen', 'report', 'status', 'demo'],
    identity: 'compliance.cspr',
    discoveredAt: new Date().toISOString(),
  },
  {
    name: 'Regulatory 📋',
    service: 'Cross-border regulatory mapping, compliance filings',
    endpoint: '/api/x402',
    operations: ['map', 'report', 'status', 'demo'],
    identity: 'regulatory.cspr',
    discoveredAt: new Date().toISOString(),
  },
  {
    name: 'Validator ✅',
    service: 'Attestation verification, proof chain validation, trust scoring',
    endpoint: '/api/x402',
    operations: ['verify', 'prove', 'status', 'demo'],
    identity: 'validator.cspr',
    discoveredAt: new Date().toISOString(),
  },
];

/**
 * Discover all swarm agents registered on this MCP network.
 */
export async function discoverAgents(): Promise<AgentDiscovery[]> {
  // In production: query Casper MCP registry and DNS-AID records.
  // For demo: return known swarm agents.
  return SWARM_AGENTS.map(a => ({
    ...a,
    discoveredAt: new Date().toISOString(),
  }));
}

/**
 * Evaluate a single agent by sending test payloads to its operations.
 */
export async function evaluateAgent(agent: AgentDiscovery): Promise<EvaluationResult> {
  const testedOperations: { name: string; passed: boolean; latencyMs: number; detail?: string }[] = [];
  const issues: string[] = [];
  const strengths: string[] = [];

  // Test service-info (every agent must have this)
  const infoResult = await testEndpoint(agent.identity, `${agent.endpoint}/service-info`, 'GET');
  testedOperations.push({ name: 'service-info', ...infoResult });
  if (infoResult.passed) strengths.push('Exposes service-info for discovery');
  else issues.push('service-info endpoint missing or unreachable');

  // Test demo (every agent has a demo mode)
  const demoResult = await testEndpoint(agent.identity, `${agent.endpoint}/demo`, 'POST', {});
  testedOperations.push({ name: 'demo', ...demoResult });
  if (demoResult.passed) strengths.push('Demo mode operational');
  else issues.push('Demo mode unavailable');

  // Agent-specific tests
  for (const op of agent.operations) {
    if (op === 'service-info' || op === 'demo') continue;

    const payload = buildTestPayload(agent.name, op);
    const result = await testEndpoint(agent.identity, `${agent.endpoint}/${op}`, op === 'status' ? 'GET' : 'POST', payload);
    testedOperations.push({ name: op, ...result });

    if (result.passed) {
      strengths.push(`${op}: responds correctly`);
    } else {
      issues.push(`${op}: ${result.detail || 'failed'}`);
    }
  }

  // Calculate scores
  const total = testedOperations.length;
  const passed = testedOperations.filter(t => t.passed).length;
  const avgLatency = testedOperations.reduce((s, t) => s + t.latencyMs, 0) / total;

  const capabilityScore = Math.round((passed / total) * 100);
  const reliabilityScore = Math.round(Math.max(0, 100 - (avgLatency / 10)));
  const overallScore = Math.round((capabilityScore * 0.6 + reliabilityScore * 0.4));

  return {
    agentName: agent.name,
    agentEndpoint: agent.endpoint,
    agentIdentity: agent.identity,
    testedOperations,
    overallScore,
    capabilityScore,
    reliabilityScore,
    issues,
    strengths,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Evaluate all discovered agents and return ranked results.
 */
export async function evaluateAllAgents(): Promise<{
  evaluations: EvaluationResult[];
  rankings: { name: string; identity: string; score: number }[];
  summary: string;
}> {
  const agents = await discoverAgents();
  const evaluations: EvaluationResult[] = [];

  for (const agent of agents) {
    const result = await evaluateAgent(agent);
    evaluations.push(result);
  }

  const rankings = evaluations
    .sort((a, b) => b.overallScore - a.overallScore)
    .map(e => ({ name: e.agentName, identity: e.agentIdentity, score: e.overallScore }));

  const avgScore = Math.round(evaluations.reduce((s, e) => s + e.overallScore, 0) / evaluations.length);
  const summary = `Evaluated ${evaluations.length} swarm agent(s). Average score: ${avgScore}/100. Top agent: ${rankings[0]?.name ?? 'none'} (${rankings[0]?.score ?? 0}/100).`;

  return { evaluations, rankings, summary };
}

// ── Helpers ────────────────────────────────────────────────────────

async function testEndpoint(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<{ passed: boolean; latencyMs: number; detail?: string }> {
  const start = Date.now();
  try {
    const url = `http://localhost:3003${path}`; // swarm agents run on 3003-3005
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(url, opts);
    const latencyMs = Date.now() - start;

    if (resp.ok) {
      return { passed: true, latencyMs };
    }
    return { passed: false, latencyMs, detail: `HTTP ${resp.status}` };
  } catch (e) {
    const latencyMs = Date.now() - start;
    return { passed: false, latencyMs, detail: (e as Error).message };
  }
}

function buildTestPayload(agentName: string, operation: string): Record<string, unknown> | undefined {
  if (agentName.includes('Compliance')) {
    switch (operation) {
      case 'screen': return { entityId: 'test-001', jurisdiction: 'US', entityType: 'individual', amount: '50000' };
      case 'report': return { sessionId: 'test-001', jurisdiction: 'US', entityType: 'individual', risk: 'medium' };
      case 'status': return undefined;
    }
  }
  if (agentName.includes('Regulatory')) {
    switch (operation) {
      case 'map': return { sourceJurisdiction: 'US', targetJurisdiction: 'EU', assetClass: 'USDC', amount: '100000', participants: [] };
      case 'report': return { sessionId: 'test-001', jurisdiction: 'US' };
      case 'status': return undefined;
    }
  }
  if (agentName.includes('Validator')) {
    switch (operation) {
      case 'verify': return { attestationCid: 'QmTest123', schemaUid: '0x' + 'a'.repeat(64), attestorAddress: '0x' + 'b'.repeat(40), chainId: 8453 };
      case 'prove': return { rootAttestation: 'QmTestRoot' };
      case 'status': return undefined;
    }
  }
  return undefined;
}
