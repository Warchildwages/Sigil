import { describe, it, expect } from 'vitest';
import { agentStatusResponseSchema } from '@sigil/shared';

describe('Agent Status Response Schema', () => {
	it('validates a complete AgentStatusResponse', () => {
		const valid = {
			wallet: {
				address: '0x3b4EcE4CdE860e0A9076f70483Db3e4209CC1175',
				chain: 'base',
				balanceUSDC: '150.00',
			},
			identity: {
				attested: true,
				agentId: '0x3b4EcE4CdE860e0A9076f70483Db3e4209CC1175',
				creatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
				attestationUid: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
				registeredAt: '2026-06-24T00:00:00Z',
			},
			x402: {
				listed: true,
				serviceId: 'sigil-v1',
				marketplaceUrl: 'https://marketplace.circle.com',
				pricing: { analyze: 1.0, knowledge: 0.5 },
			},
			uptime: '2h 15m',
			version: '1.0.0',
		};

		const result = agentStatusResponseSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it('validates a minimal AgentStatusResponse (no optional identity fields)', () => {
		const minimal = {
			wallet: {
				address: '0x0000000000000000000000000000000000000000',
				chain: 'base',
				balanceUSDC: '0.00',
			},
			identity: {
				attested: false,
			},
			x402: {
				listed: true,
				serviceId: 'sigil-v1',
				marketplaceUrl: 'https://marketplace.circle.com',
				pricing: {},
			},
			uptime: '<1m',
			version: '1.0.0',
		};

		const result = agentStatusResponseSchema.safeParse(minimal);
		expect(result.success).toBe(true);
	});

	it('rejects invalid AgentStatusResponse (missing wallet.address)', () => {
		const invalid = {
			wallet: {
				chain: 'base',
				balanceUSDC: '0.00',
			},
			identity: {
				attested: false,
			},
			x402: {
				listed: true,
				serviceId: 'sigil-v1',
				marketplaceUrl: 'https://marketplace.circle.com',
				pricing: {},
			},
			uptime: '<1m',
			version: '1.0.0',
		};

		const result = agentStatusResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it('rejects invalid AgentStatusResponse (x402.listed not boolean)', () => {
		const invalid = {
			wallet: {
				address: '0x0000000000000000000000000000000000000000',
				chain: 'base',
				balanceUSDC: '0.00',
			},
			identity: {
				attested: false,
			},
			x402: {
				listed: 'yes',
				serviceId: 'sigil-v1',
				marketplaceUrl: 'https://marketplace.circle.com',
				pricing: {},
			},
			uptime: '<1m',
			version: '1.0.0',
		};

		const result = agentStatusResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it('validates with empty pricing record', () => {
		const valid = {
			wallet: {
				address: '0x3b4EcE4CdE860e0A9076f70483Db3e4209CC1175',
				chain: 'base',
				balanceUSDC: '0.00',
			},
			identity: {
				attested: true,
			},
			x402: {
				listed: false,
				serviceId: 'sigil-v1',
				marketplaceUrl: 'https://marketplace.circle.com',
				pricing: {},
			},
			uptime: '12d 4h',
			version: '1.0.0',
		};

		const result = agentStatusResponseSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});
});