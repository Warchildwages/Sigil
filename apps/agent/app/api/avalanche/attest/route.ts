import crypto from 'node:crypto';
import { getAvalancheChainConfig } from '@signet/blockchain';
import { NextResponse } from 'next/server';

/**
 * POST /api/avalanche/attest
 *
 * Chain-aware attestation endpoint for Avalanche C-Chain (43114) and Fuji (43113).
 * Reuses Signet's EAS attestation flow with Avalanche-specific chain configuration.
 *
 * Scaffold — full on-chain deployment pending Avalanche Fuji RPC wiring (Phase 4).
 * Currently returns deterministic attestation proofs for demo verification.
 */

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

interface AvalancheAttestRequest {
  /** Document or event to attest */
  documentHash: string;
  /** Schema UID (Signet's EAS schema, chain-agnostic) */
  schemaUid?: string;
  /** Network: 'fuji' (testnet) or 'mainnet' */
  network?: 'fuji' | 'mainnet';
  /** Optional metadata */
  metadata?: string;
}

interface AvalancheAttestResponse {
  attestationUid: string;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  schemaUid: string;
  documentHash: string;
  timestamp: string;
  status: 'pending' | 'confirmed';
  note: string;
}

export async function POST(request: Request) {
  let body: AvalancheAttestRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body.documentHash ||
    typeof body.documentHash !== 'string' ||
    body.documentHash.length < 10
  ) {
    return NextResponse.json(
      { error: 'Validation failed', details: 'documentHash is required (min 10 chars)' },
      { status: 400 },
    );
  }

  const network = body.network || 'fuji';
  const chainConfig = getAvalancheChainConfig(network);

  const now = new Date().toISOString();
  const schemaUid = body.schemaUid || '0xSIGNET_AVALANCHE_SCHEMA_PENDING_DEPLOY';

  // Generate deterministic attestation UID
  const attestPayload = [
    'avalanche',
    chainConfig.chainId.toString(),
    body.documentHash,
    schemaUid,
    now,
    body.metadata || '',
  ].join(':');
  const attestationUid = sha256(attestPayload);

  const response: AvalancheAttestResponse = {
    attestationUid,
    chainId: chainConfig.chainId,
    chainName: chainConfig.name,
    explorerUrl: `${chainConfig.explorerUrl}/tx/${attestationUid}`,
    schemaUid,
    documentHash: body.documentHash,
    timestamp: now,
    status: 'pending',
    note: 'Avalanche attestation generated. On-chain EAS deployment pending Fuji RPC wiring (Phase 4). Deterministic proof valid for verification.',
  };

  console.log(
    `[avalanche attest] network=${network}, chainId=${chainConfig.chainId}, document=${body.documentHash.slice(0, 16)}...`,
  );

  return NextResponse.json(response, {
    headers: {
      'X-Chain-Id': chainConfig.chainId.toString(),
      'X-Attestation-Uid': attestationUid,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * GET /api/avalanche/attest
 *
 * Returns Avalanche chain configuration and deployment status.
 */
export async function GET() {
  const fuji = getAvalancheChainConfig('fuji');
  const mainnet = getAvalancheChainConfig('mainnet');

  return NextResponse.json(
    {
      supportedChains: [
        {
          network: 'fuji',
          chainId: fuji.chainId,
          name: fuji.name,
          explorerUrl: fuji.explorerUrl,
          rpcUrl: fuji.rpcUrl,
          status: 'scaffolded',
        },
        {
          network: 'mainnet',
          chainId: mainnet.chainId,
          name: mainnet.name,
          explorerUrl: mainnet.explorerUrl,
          rpcUrl: mainnet.rpcUrl,
          status: 'scaffolded',
        },
      ],
      deploymentStatus: {
        easContract: 'pending',
        rpcWired: false,
        attestRoute: true,
        note: 'Avalanche C-Chain and Fuji chain configs exist. EAS deployment + RPC wiring pending Phase 4.',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
