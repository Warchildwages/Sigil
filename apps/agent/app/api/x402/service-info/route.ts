import type { X402ServiceListing } from '@sigil/shared';
import { X402_OPERATION_DESCRIPTIONS, X402_PRICING } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { casperServiceInfo } from '@/lib/x402-casper-adapter';

const AGENT_WALLET =
  process.env.SIGNET_AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
const BUILDER_CODE = process.env.SIGNET_BUILDER_CODE || 'bc_2jqg6gik';

export const SERVICE_INFO: X402ServiceListing = {
  serviceId: 'sigil-v1',
  name: 'Sigil — Legal Clarity Agent by Signet',
  description:
    'AI-powered legal document analysis, risk scoring, industry benchmarks, contract structure extraction, legal knowledge Q&A, agent-to-agent witnessing, escrow verification, binding dispute resolution, proof of existence timestamping, regulatory compliance auditing, agent reputation scoring, legal event oracle, milestone verification, and translation fidelity attestation. Pay per use in USDC via Circle x402 nanopayments.',
  docsUrl: 'https://signet.ventures/docs/agent',
  endpoint: 'https://signet.ventures/api/x402',
  priceUSDC: X402_PRICING.analyze as number,
  operations: {
    analyze: { price: X402_PRICING.analyze as number, description: X402_OPERATION_DESCRIPTIONS.analyze as string },
    knowledge: { price: X402_PRICING.knowledge as number, description: X402_OPERATION_DESCRIPTIONS.knowledge as string },
    witness: { price: X402_PRICING.witness as number, description: X402_OPERATION_DESCRIPTIONS.witness as string },
    timestamp: { price: X402_PRICING.timestamp as number, description: X402_OPERATION_DESCRIPTIONS.timestamp as string },
    compliance: { price: X402_PRICING.compliance as number, description: X402_OPERATION_DESCRIPTIONS.compliance as string },
    reputation: { price: X402_PRICING.reputation as number, description: X402_OPERATION_DESCRIPTIONS.reputation as string },
    oracle: { price: X402_PRICING.oracle as number, description: X402_OPERATION_DESCRIPTIONS.oracle as string },
    milestone: { price: X402_PRICING.milestone as number, description: X402_OPERATION_DESCRIPTIONS.milestone as string },
    translate: { price: X402_PRICING.translate as number, description: X402_OPERATION_DESCRIPTIONS.translate as string },
  },
  rateLimit: { requestsPerMinute: 10, maxDocumentSizeBytes: 20000 },
  receivesPaymentAt: AGENT_WALLET,
};

export async function GET() {
  return NextResponse.json({
    ...SERVICE_INFO,
    builderCode: BUILDER_CODE,
    erc8021: `https://base.org/developers/builder-code?code=${BUILDER_CODE}`,
    casper: casperServiceInfo(),
    registries: {
      circle: 'https://marketplace.circle.com',
      base: 'https://base.org/ecosystem',
      arclenz: 'https://arclenz.xyz',
      skills: 'https://github.com/base/skills',
      casper: 'https://dorahacks.io/hackathon/casper-agentic-buildathon',
    },
  }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
  });
}
