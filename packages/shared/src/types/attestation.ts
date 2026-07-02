import type { PrivacyMode } from './document.js';

export type AttestationProtocol = 'EAS' | 'ArcaneVM' | 'Avalanche_Subnet' | 'Solana_Attestation';

export interface Attestation {
  id: string;
  documentId: string;
  protocol: AttestationProtocol;
  protocolUid: string;
  schemaUid: string;
  attester: string;
  recipient: string;
  data: string;
  privacyMode: PrivacyMode;
  chainId: number;
  blockNumber: number | null;
  transactionHash: string | null;
  attestedAt: Date | null;
  createdAt: Date;
}

export interface SignetAttestationData {
  contentHash: string;
  title: string;
  signer: string;
  signedAt: bigint;
  privacyMode: number;
  signingMethod: number;
  supplementaryProof: string;
}
