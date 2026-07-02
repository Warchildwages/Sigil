export type DocumentStatus = 'draft' | 'pending_signatures' | 'signed' | 'attested' | 'amended' | 'revoked';

export type PrivacyMode = 'public' | 'semi_private' | 'fully_private';

export interface Document {
  id: string;
  title: string;
  contentHash: string;
  contentUri: string | null;
  mimeType: string;
  status: DocumentStatus;
  privacyMode: PrivacyMode;
  chainId: number;
  createdAt: Date;
  updatedAt: Date;
  createdByEntityId: string;
}