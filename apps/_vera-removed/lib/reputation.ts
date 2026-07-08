/**
 * Vera — Reputation Aggregator
 *
 * Collects and aggregates reputation events from multiple sources:
 * transaction history, dispute records, user reports, other verifiers.
 */

import type { ReputationEvent, AgentRecord } from './types';

/** In-memory reputation store — production would use EAS + DB */
const reputationStore: Map<string, ReputationEvent[]> = new Map();

/* Seed data for the demo */
function seedReputation(): void {
  if (reputationStore.size > 0) return;

  // Luna's reputation
  const lunaEvents: ReputationEvent[] = [];
  for (let i = 0; i < 50; i++) {
    lunaEvents.push({
      eventId: `luna-txn-${i}`,
      agentId: 'luna',
      type: 'transaction',
      outcome: 'positive',
      source: 'chain',
      detail: `Ticket sale #${1000 + i} — completed successfully`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    });
  }
  lunaEvents.push({
    eventId: 'luna-dispute-1',
    agentId: 'luna',
    type: 'dispute',
    outcome: 'positive',
    source: 'sigil',
    detail: 'Dispute #42 — resolved in Luna\'s favor (artist paid, venue no-show)',
    evidenceCid: 'QmDispute42',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  });
  reputationStore.set('luna', lunaEvents);

  // Sigil's reputation
  const sigilEvents: ReputationEvent[] = [];
  sigilEvents.push({
    eventId: 'sigil-txn-1',
    agentId: 'sigil',
    type: 'transaction',
    outcome: 'positive',
    source: 'chain',
    detail: 'Notarized 500+ documents across 4 chains',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  });
  reputationStore.set('sigil', sigilEvents);

  // TicketBot's reputation
  const ticketBotEvents: ReputationEvent[] = [];
  ticketBotEvents.push({
    eventId: 'tb-fail-1',
    agentId: 'ticketbot',
    type: 'verification',
    outcome: 'negative',
    source: 'vera',
    detail: 'Ed25519 key mismatch — possible impersonation',
    timestamp: new Date().toISOString(),
  });
  reputationStore.set('ticketbot', ticketBotEvents);
}

seedReputation();

/**
 * Get reputation events for an agent.
 */
export function getReputation(agentId: string): ReputationEvent[] {
  return reputationStore.get(agentId) ?? [];
}

/**
 * Submit a reputation event (from any source).
 */
export function submitReputation(event: ReputationEvent): void {
  const existing = reputationStore.get(event.agentId) ?? [];
  existing.push(event);
  reputationStore.set(event.agentId, existing);
}

/**
 * Aggregate reputation into summary metrics.
 */
export function aggregateReputation(agentId: string): {
  totalTransactions: number;
  successfulTransactions: number;
  disputes: number;
  unresolvedDisputes: number;
  reports: number;
  recentEvents: ReputationEvent[];
} {
  const events = getReputation(agentId);
  const recentEvents = events.slice(-10).reverse();

  const transactions = events.filter((e) => e.type === 'transaction');
  const disputes = events.filter((e) => e.type === 'dispute');
  const reports = events.filter((e) => e.type === 'report');

  return {
    totalTransactions: transactions.length,
    successfulTransactions: transactions.filter((e) => e.outcome === 'positive').length,
    disputes: disputes.length,
    unresolvedDisputes: disputes.filter((e) => e.outcome === 'pending').length,
    reports: reports.length,
    recentEvents,
  };
}

/**
 * Get warnings for an agent based on reputation data.
 */
export function getWarnings(agentId: string): string[] {
  const warnings: string[] = [];
  const events = getReputation(agentId);

  const unresolved = events.filter((e) => e.type === 'dispute' && e.outcome === 'pending');
  if (unresolved.length > 0) {
    warnings.push(`${unresolved.length} unresolved dispute(s)`);
  }

  const negativeReports = events.filter(
    (e) => e.type === 'report' && e.outcome === 'negative',
  );
  if (negativeReports.length > 0) {
    warnings.push(`${negativeReports.length} user report(s) — ${negativeReports[0]?.detail}`);
  }

  const failedVerifications = events.filter(
    (e) => e.type === 'verification' && e.outcome === 'negative',
  );
  if (failedVerifications.length > 0) {
    warnings.push('Recent verification failed — agent may be compromised');
  }

  return warnings;
}
