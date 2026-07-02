import type { SigningMethod } from '@sigil/shared';

/**
 * Document mode determines the template context for the widget.
 */
export type SignetMode = 'nda' | 'vendor-agreement' | 'generic';

/**
 * Pre-fill data the consumer can pass to populate document metadata.
 */
export interface SignetPrefillData {
  documentTitle?: string;
  counterpartyName?: string;
}

/**
 * Configuration for the Circle SDK (optional — widget degrades gracefully).
 */
export interface SignetCircleConfig {
  apiKey: string;
  rpcUrl: string;
}

/**
 * Core props for <SignetWidget>.
 */
export interface SignetWidgetProps {
  /** Signet entity ID (e.g. AllFans as an entity on Signet). */
  entityId: string;

  /** Document context. Defaults to 'generic'. */
  mode?: SignetMode;

  /** Base URL of the Signet API. */
  apiBaseUrl: string;

  /** Called when an EAS attestation is successfully created. */
  onAttested?: (uid: string, txHash: string) => void;

  /** Called on any unrecoverable error. */
  onError?: (error: Error) => void;

  /** Optional Circle config for real on-chain attestation. */
  circleConfig?: SignetCircleConfig;

  /** Pre-fill data for the document. */
  prefillData?: SignetPrefillData;

  /** CSS class name for the outermost wrapper. */
  className?: string;
}

/**
 * Step in the signing pipeline.
 */
export type SignetStep = 'upload' | 'analyze' | 'sign' | 'verify';

/**
 * State tracked by the widget session hook.
 */
export interface SignetSessionState {
  step: SignetStep;
  hash: `0x${string}` | null;
  fileName: string | null;
  file: File | null;
  documentId: string | null;
  signingMethod: SigningMethod | null;
  attestationUid: string | null;
  isMockAttestation: boolean;
  apiError: string | null;
  setStep: (step: SignetStep) => void;
  setHash: (hash: `0x${string}`, file: File) => void;
  setDocumentId: (id: string) => void;
  setSigningMethod: (method: SigningMethod) => void;
  setAttestationUid: (uid: string, isMock: boolean) => void;
  setApiError: (msg: string | null) => void;
  reset: () => void;
}