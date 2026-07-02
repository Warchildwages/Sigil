export type SignatureStatus = 'pending' | 'signed' | 'declined';

export type SigningMethod = 'passkey' | 'swipe' | 'stylus' | 'wallet_connect';

export interface Signature {
  id: string;
  documentId: string;
  entityId: string;
  roleId: string | null;
  officeholderId: string | null;
  signerWallet: string;
  signatureProof: string;
  signingMethod: SigningMethod;
  supplementaryProof: string | null;
  chainId: number;
  status: SignatureStatus;
  signedAt: Date | null;
  createdAt: Date;
}