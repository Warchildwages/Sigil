import { useCallback } from 'react';
import type { SignetMode, SignetPrefillData } from '../types.js';

interface SignetApiOptions {
  apiBaseUrl: string;
  entityId: string;
  mode?: SignetMode;
  prefillData?: SignetPrefillData;
  csrfToken?: string;
  onAuthRequired?: () => void;
}

interface CreateDocumentResult {
  id: string;
  title: string;
  contentHash: string;
}

interface AttestationResult {
  id: string;
  protocolUid: string;
  transactionHash?: string;
}

/**
 * Thin API client for Signet backend routes.
 * All calls go to the consumer-specified `apiBaseUrl`.
 */
export function useSignetApi({ apiBaseUrl, entityId, mode, prefillData, csrfToken, onAuthRequired }: SignetApiOptions) {
  const createDocument = useCallback(
    async (hash: `0x${string}`, fileName: string, mimeType: string): Promise<CreateDocumentResult> => {
      const title =
        prefillData?.documentTitle ||
        fileName.replace(/\.[^.]+$/, '');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${apiBaseUrl}/api/documents`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title,
          contentHash: hash,
          mimeType: mimeType || 'application/pdf',
          privacyMode: 'public',
          chainId: 84532,
          createdByEntityId: entityId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create document' }));
        throw new Error(err.error || 'Failed to create document');
      }

      return res.json();
    },
    [apiBaseUrl, entityId, prefillData],
  );

  const recordSignature = useCallback(
    async (
      documentId: string,
      signerWallet: `0x${string}`,
      hash: `0x${string}`,
      signingMethod: string,
      supplementaryProof?: string,
    ): Promise<void> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${apiBaseUrl}/api/signatures`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          entityId,
          signerWallet,
          signatureProof: hash,
          signingMethod,
          supplementaryProof: supplementaryProof ?? null,
          chainId: 84532,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to record signature' }));
        throw new Error(err.error || 'Failed to record signature');
      }
    },
    [apiBaseUrl, entityId],
  );

  const recordAttestation = useCallback(
    async (payload: {
      documentId: string;
      protocolUid: string;
      schemaUid: string;
      attester: `0x${string}`;
      data: `0x${string}`;
      chainId: number;
      transactionHash: string;
    }): Promise<AttestationResult> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${apiBaseUrl}/api/attest`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          protocol: 'EAS',
          recipient: '0x0000000000000000000000000000000000000000',
          privacyMode: 'public',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to record attestation' }));
        throw new Error(err.error || 'Failed to record attestation');
      }

      return res.json();
    },
    [apiBaseUrl],
  );

  const analyzeDocument = useCallback(
    async (file: File): Promise<Record<string, unknown>> => {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || 'Analysis failed');
      }

      return res.json();
    },
    [apiBaseUrl],
  );

  return { createDocument, recordSignature, recordAttestation, analyzeDocument };
}