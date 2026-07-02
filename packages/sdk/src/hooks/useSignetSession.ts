import { useState, useCallback, useRef } from 'react';
import type { SigningMethod } from '@signet/shared';
import type { SignetStep, SignetPrefillData } from '../types.js';
import { useSignetApi } from './useSignetApi.js';
import type { SmartAccount } from '@signet/blockchain/circle';
import { attestOnChain } from '@signet/blockchain/eas';
import { registerSchema, SIGNET_SCHEMA_UID } from '@signet/blockchain/eas-schema';
import { EAS_CONTRACT_ADDRESS, CHAIN_IDS } from '@signet/shared';

interface UseSignetSessionOptions {
  apiBaseUrl: string;
  entityId: string;
  prefillData?: SignetPrefillData;
  onAttested?: (uid: string, txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseSignetSessionReturn {
  step: SignetStep;
  hash: `0x${string}` | null;
  fileName: string | null;
  file: File | null;
  documentId: string | null;
  signingMethod: SigningMethod | null;
  attestationUid: string | null;
  isMockAttestation: boolean;
  apiError: string | null;
  analysisResult: Record<string, unknown> | null;
  setStep: (step: SignetStep) => void;
  handleUpload: (docHash: `0x${string}`, file: File) => Promise<void>;
  handleSign: (method: SigningMethod, account: SmartAccount | null, supplementaryProof?: string) => Promise<void>;
  setApiError: (msg: string | null) => void;
  reset: () => void;
}

export function useSignetSession({
  apiBaseUrl,
  entityId,
  prefillData,
  onAttested,
  onError,
}: UseSignetSessionOptions): UseSignetSessionReturn {
  const [step, setStep] = useState<SignetStep>('upload');
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [signingMethod, setSigningMethod] = useState<SigningMethod | null>(null);
  const [attestationUid, setAttestationUid] = useState<string | null>(null);
  const [isMockAttestation, setIsMockAttestation] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);

  const api = useSignetApi({ apiBaseUrl, entityId, prefillData });
  const signingRef = useRef(false);

  const handleUpload = useCallback(
    async (docHash: `0x${string}`, uploadedFile: File) => {
      setHash(docHash);
      setFileName(uploadedFile.name);
      setFile(uploadedFile);
      setApiError(null);

      try {
        const doc = await api.createDocument(docHash, uploadedFile.name, uploadedFile.type);
        setDocumentId(doc.id);
        // Run analysis in parallel while we have the file
        try {
          const result = await api.analyzeDocument(uploadedFile);
          setAnalysisResult(result);
        } catch {
          // Analysis is non-blocking
        }

        setStep('analyze');
      } catch (err) {
        console.error('Document persist failed:', err);
        setApiError(err instanceof Error ? err.message : 'Failed to save document. Is the API running?');
        onError?.(err instanceof Error ? err : new Error('Failed to save document'));
        // Stay on upload step — don't advance without a document ID
      }
    },
    [api, onError],
  );

  const handleSign = useCallback(
    async (method: SigningMethod, account: SmartAccount | null, supplementaryProof?: string) => {
      if (signingRef.current) return;
      signingRef.current = true;

      setSigningMethod(method);

      if (!documentId) {
        setApiError('No document ID — document must be uploaded first');
        signingRef.current = false;
        return;
      }

      try {
        const signerWallet = account
          ? (account as unknown as { address: `0x${string}` }).address
          : ('0x0000000000000000000000000000000000000000' as `0x${string}`);

        await api.recordSignature(
          documentId,
          signerWallet,
          hash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
          method,
          supplementaryProof ?? undefined,
        );

        // Try real on-chain attestation if we have a smart account
        if (account) {
          try {
            const chainId = CHAIN_IDS.BASE_SEPOLIA;
            const easAddr = EAS_CONTRACT_ADDRESS[chainId] as `0x${string}`;

            let schemaUid = SIGNET_SCHEMA_UID[chainId];
            if (!schemaUid) {
              schemaUid = await registerSchema(chainId, easAddr, account);
            }

            const result = await attestOnChain(
              chainId,
              schemaUid,
              {
                contentHash: hash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
                title: fileName ?? 'Signet Document',
                signer: signerWallet,
                signedAt: BigInt(Math.floor(Date.now() / 1000)),
                privacyMode: 0,
                signingMethod: method === 'passkey' ? 0 : method === 'swipe' ? 1 : method === 'stylus' ? 2 : 3,
                supplementaryProof: supplementaryProof ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
              },
              '0x0000000000000000000000000000000000000000' as `0x${string}`,
              account,
            );

            await api.recordAttestation({
              documentId,
              protocolUid: result.uid,
              schemaUid,
              attester: signerWallet,
              data: hash ?? '0x',
              chainId,
              transactionHash: result.txHash,
            });

            setAttestationUid(result.uid);
            setIsMockAttestation(false);
            setApiError(null);
            onAttested?.(result.uid, result.txHash);
            setStep('verify');
            signingRef.current = false;
            return;
          } catch (onchainErr) {
            console.error('On-chain attestation failed, falling back to mock:', onchainErr);
            setApiError(
              `On-chain attestation failed (${onchainErr instanceof Error ? onchainErr.message : 'unknown error'}). Using mock attestation.`,
            );
          }
        }

        // Mock attestation fallback
        const mockUid = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setAttestationUid(mockUid);
        setIsMockAttestation(true);
        setApiError(null);
      } catch (err) {
        console.error('Signature/attest persist failed:', err);
        setApiError(err instanceof Error ? err.message : 'Failed to persist signature');
        onError?.(err instanceof Error ? err : new Error('Signature failed'));

        // Still allow moving forward with mock UID
        const mockUid = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setAttestationUid(mockUid);
        setIsMockAttestation(true);
      }

      signingRef.current = false;
      setStep('verify');
    },
    [api, documentId, hash, fileName, onAttested, onError],
  );

  const reset = useCallback(() => {
    setStep('upload');
    setHash(null);
    setFileName(null);
    setFile(null);
    setDocumentId(null);
    setSigningMethod(null);
    setAttestationUid(null);
    setIsMockAttestation(false);
    setApiError(null);
    setAnalysisResult(null);
    signingRef.current = false;
  }, []);

  return {
    step,
    hash,
    fileName,
    file,
    documentId,
    signingMethod,
    attestationUid,
    isMockAttestation,
    apiError,
    analysisResult,
    setStep,
    handleUpload,
    handleSign,
    setApiError,
    reset,
  };
}