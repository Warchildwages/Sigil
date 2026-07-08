/**
 * Vera — Agent Capability Evaluator
 *
 * Tests an agent's endpoints with real payloads and scores their
 * capabilities. Each agent type gets relevant tests.
 */

import type { AgentRecord, EvaluationScore, VerificationResult } from './types';

/** Test result for a single operation */
interface OpTest {
  name: string;
  passed: boolean;
  latencyMs: number;
  detail?: string;
}

/**
 * Evaluate an agent's capabilities by testing their endpoints.
 */
export async function evaluateAgent(
  agent: AgentRecord,
  verification: VerificationResult,
): Promise<EvaluationScore> {
  const tests: OpTest[] = [];
  const testTime = new Date().toISOString();

  // Test service-info endpoint (all agents should have this)
  tests.push(await testOperation(agent, 'service-info', 'GET'));

  // Test capability-specific endpoints
  for (const cap of agent.capabilities.slice(0, 5)) {
    tests.push(await testOperation(agent, cap, 'POST', { demo: true }));
  }

  // Calculate dimension scores
  const identityScore = calculateIdentityScore(verification);
  const capabilityScore = calculateCapabilityScore(tests);
  const reliabilityScore = calculateReliabilityScore(tests);

  // Build dimension breakdown
  const dimensions = [
    { name: 'identity', score: identityScore, detail: descriptionForIdentity(identityScore) },
    { name: 'capability', score: capabilityScore, detail: descriptionForCapability(capabilityScore) },
    { name: 'reliability', score: reliabilityScore, detail: descriptionForReliability(reliabilityScore) },
  ];

  // Add per-operation dimensions
  for (const test of tests) {
    dimensions.push({
      name: `op:${test.name}`,
      score: test.passed ? 100 : 0,
      detail: test.detail ?? (test.passed ? 'Responded correctly' : 'Failed or unreachable'),
    });
  }

  const overall = Math.round(identityScore * 0.3 + capabilityScore * 0.4 + reliabilityScore * 0.3);

  return {
    agentId: agent.agentId,
    overall,
    identity: identityScore,
    capability: capabilityScore,
    reliability: reliabilityScore,
    dimensions,
    testedAt: testTime,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
}

async function testOperation(
  agent: AgentRecord,
  operation: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<OpTest> {
  const start = Date.now();
  try {
    const url = `${agent.endpoint}/api/${operation === 'service-info' ? `x402/${operation}` : `x402/${operation}`}`;
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(url, opts);
    const latencyMs = Date.now() - start;
    const passed = resp.ok || resp.status === 402;

    return {
      name: operation,
      passed,
      latencyMs,
      detail: passed
        ? `HTTP ${resp.status} (${latencyMs}ms)`
        : `HTTP ${resp.status} (${latencyMs}ms)`,
    };
  } catch (e) {
    return {
      name: operation,
      passed: false,
      latencyMs: Date.now() - start,
      detail: (e as Error).message,
    };
  }
}

function calculateIdentityScore(v: VerificationResult): number {
  let score = 0;
  if (v.keyValid) score += 40;
  if (v.endpointReachable) score += 30;
  if (v.didNostrValid) score += 30;
  return score;
}

function calculateCapabilityScore(tests: OpTest[]): number {
  if (tests.length === 0) return 0;
  const passed = tests.filter((t) => t.passed).length;
  return Math.round((passed / tests.length) * 100);
}

function calculateReliabilityScore(tests: OpTest[]): number {
  if (tests.length === 0) return 0;
  const avgLatency = tests.reduce((s, t) => s + t.latencyMs, 0) / tests.length;
  return Math.round(Math.max(0, 100 - avgLatency / 10));
}

function descriptionForIdentity(score: number): string {
  if (score >= 90) return 'Strong identity — key, endpoint, and DID all verified';
  if (score >= 60) return 'Partial identity — key verified but some checks incomplete';
  return 'Weak identity — key or endpoint verification failed';
}

function descriptionForCapability(score: number): string {
  if (score >= 90) return 'All claimed capabilities respond correctly';
  if (score >= 60) return 'Most capabilities respond, some gaps';
  return 'Few capabilities confirmed — agent may not deliver';
}

function descriptionForReliability(score: number): string {
  if (score >= 90) return 'Fast response times across all endpoints';
  if (score >= 60) return 'Adequate response times';
  return 'Slow or inconsistent response times';
}
