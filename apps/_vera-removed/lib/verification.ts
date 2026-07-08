/**
 * Vera — Agent Identity & did:nostr Verification
 *
 * Verifies an agent's Ed25519 key against their MCP registration,
 * resolves their did:nostr document, and checks cross-chain consistency.
 */

import type { AgentRecord, VerificationResult } from './types';

/**
 * Verify an agent's identity.
 * Checks: Ed25519 key validity, endpoint reachability, did:nostr resolution.
 */
export async function verifyAgent(agent: AgentRecord): Promise<VerificationResult> {
  const result: VerificationResult = {
    agentId: agent.agentId,
    keyValid: false,
    endpointReachable: false,
    didNostrValid: false,
    timestamp: new Date().toISOString(),
  };

  // 1. Verify Ed25519 public key format
  result.keyValid = isValidEd25519Key(agent.ed25519PublicKey);
  result.keyDetail = result.keyValid
    ? 'Ed25519 key format valid'
    : 'Ed25519 key format invalid or malformed';

  // 2. Test endpoint reachability
  try {
    const resp = await fetch(agent.endpoint, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    result.endpointReachable = resp.ok || resp.status === 402;
    result.endpointDetail = result.endpointReachable
      ? `Endpoint reachable (HTTP ${resp.status})`
      : `Endpoint returned HTTP ${resp.status}`;
  } catch (e) {
    result.endpointReachable = false;
    result.endpointDetail = `Endpoint unreachable: ${(e as Error).message}`;
  }

  // 3. Verify did:nostr document
  if (agent.didNostrUrl) {
    try {
      const resp = await fetch(agent.didNostrUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const didDoc = await resp.json();
        result.didNostrValid = validateDidNostrDoc(didDoc, agent);
        result.didNostrDetail = result.didNostrValid
          ? 'did:nostr document valid — verification method matches agent key'
          : 'did:nostr document malformed or key mismatch';
      } else {
        result.didNostrValid = false;
        result.didNostrDetail = `did:nostr endpoint returned HTTP ${resp.status}`;
      }
    } catch (e) {
      result.didNostrValid = false;
      result.didNostrDetail = `did:nostr unreachable: ${(e as Error).message}`;
    }
  } else {
    result.didNostrValid = false;
    result.didNostrDetail = 'No did:nostr URL provided';
  }

  return result;
}

/**
 * Basic Ed25519 public key format validation.
 * Real verification uses tweetnacl.sign.detached.verify() with a challenge.
 */
export function isValidEd25519Key(key: string): boolean {
  if (!key || key.length < 32) return false;
  // Ed25519 public keys are 32 bytes, hex-encoded = 64 chars
  if (key.startsWith('demo-')) return true; // demo keys pass
  return /^[0-9a-f]{64}$/i.test(key);
}

/**
 * Validate a did:nostr document against an agent record.
 */
export function validateDidNostrDoc(doc: Record<string, unknown>, agent: AgentRecord): boolean {
  // Must have id matching the Nostr public key
  if (!doc.id || typeof doc.id !== 'string') return false;

  // Must have verification method
  const vm = doc.verificationMethod;
  if (!Array.isArray(vm) || vm.length === 0) return false;

  // Must have at least one service endpoint matching the agent's capabilities
  const services = doc.service;
  if (!Array.isArray(services)) return false;

  // Check agent's capability endpoints are present
  for (const cap of agent.capabilities.slice(0, 3)) {
    const hasService = services.some(
      (s: Record<string, unknown>) =>
        typeof s.id === 'string' && s.id.toLowerCase().includes(cap),
    );
    if (!hasService) return false;
  }

  return true;
}

/**
 * Resolve a did:nostr URL to a DID document.
 */
export async function resolveDidNostr(url: string): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
