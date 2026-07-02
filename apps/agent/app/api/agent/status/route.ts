import { NextResponse } from 'next/server';
import type { AgentStatusResponse } from '@sigil/shared';
import { SERVICE_INFO } from '@/app/api/x402/service-info/route';

/**
 * GET /api/agent/status
 *
 * Unified public endpoint returning the agent's complete status:
 * wallet (address, chain, balance), identity (attestation), x402 (marketplace listing),
 * uptime, and version.
 *
 * No auth required — this is public agent metadata, like service-info.
 * Cache: 60 seconds (status changes infrequently).
 */

const AGENT_WALLET_ADDRESS =
	process.env.SIGNET_AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

const AGENT_CHAIN = process.env.SIGNET_AGENT_CHAIN || 'base';

const VERSION = '1.0.0'; // Bump with agent upgrades

export async function GET() {
	const address = AGENT_WALLET_ADDRESS;
	const chain = AGENT_CHAIN;
	const balanceUSDC = '0.00'; // Circle CLI needed for real balance; placeholder for demo

	// Build identity status from env vars (real attestation data would come from
	// @sigil/blockchain's getAgentIdentity / verifyAgentIdentity when Base RPC is available)
	const identityAttested = !!process.env.SIGNET_AGENT_WALLET_ADDRESS;
	const agentId = process.env.SIGNET_AGENT_WALLET_ADDRESS || undefined;
	const creatorAddress = process.env.SIGNET_CREATOR_ADDRESS || undefined;
	const attestationUid = process.env.SIGNET_AGENT_ATTESTATION_UID || undefined;
	const registeredAt = process.env.SIGNET_AGENT_REGISTERED_AT || undefined;

	const status: AgentStatusResponse = {
		wallet: {
			address,
			chain,
			balanceUSDC,
		},
		identity: {
			attested: identityAttested,
			agentId,
			creatorAddress,
			attestationUid,
			registeredAt,
		},
		x402: {
			listed: true,
			serviceId: SERVICE_INFO.serviceId,
			marketplaceUrl: 'https://marketplace.circle.com',
			pricing: {
				analyze: SERVICE_INFO.operations.analyze.price,
				knowledge: SERVICE_INFO.operations.knowledge.price,
			},
		},
		casper: {
			wallet: process.env.SIGIL_CASPER_WALLET || undefined,
			network: process.env.CASPER_NETWORK || 'casper:casper-test',
			attestationsCount: 0,
			contractHash: process.env.AGENT_ATTEST_CONTRACT_HASH || undefined,
		},
		uptime: formatUptime(process.uptime()),
		version: VERSION,
	};

	return NextResponse.json(status, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'public, max-age=60',
		},
	});
}

function formatUptime(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const parts: string[] = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (parts.length === 0) parts.push('<1m');
	return parts.join(' ');
}