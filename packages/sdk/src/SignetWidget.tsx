'use client';

import { useRef } from 'react';
import type { SigningMethod } from '@sigil/shared';
import type { SmartAccount } from '@sigil/blockchain/circle';
import { useSignetContext } from './SignetProvider.js';
import { useSignetSession } from './hooks/useSignetSession.js';
import { StepTracker } from './components/StepTracker.js';
import { SignetUpload } from './components/SignetUpload.js';
import { SignetAnalyze } from './components/SignetAnalyze.js';
import { SignetSign } from './components/SignetSign.js';
import { SignetVerify } from './components/SignetVerify.js';

export function SignetWidget() {
  const ctx = useSignetContext();
  const signingRef = useRef(false);

  const {
    step,
    hash,
    fileName,
    file,
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
  } = useSignetSession({
    apiBaseUrl: ctx.apiBaseUrl,
    entityId: ctx.entityId,
    prefillData: ctx.prefillData,
    onAttested: ctx.onAttested,
    onError: ctx.onError,
  });

  const handleSignBridge = async (
    method: SigningMethod,
    account: SmartAccount | null,
    supplementaryProof?: string,
  ) => {
    if (signingRef.current) return;
    signingRef.current = true;
    try {
      await handleSign(method, account, supplementaryProof);
    } finally {
      signingRef.current = false;
    }
  };

  return (
    <div className="signet-widget-content">
      {/* Step Tracker */}
      <StepTracker currentStep={step} />

      {/* Error Banner */}
      {apiError && (
        <div className="signet-error-banner">{apiError}</div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <SignetUpload
          onHash={handleUpload}
          prefillTitle={ctx.prefillData?.documentTitle}
        />
      )}

      {/* Step 2: Analyze */}
      {step === 'analyze' && hash && (
        <SignetAnalyze
          fileName={fileName}
          hash={hash}
          analysisResult={analysisResult}
          onContinue={() => setStep('sign')}
        />
      )}

      {/* Step 3: Sign */}
      {step === 'sign' && hash && (
        <SignetSign
          documentHash={hash}
          onSign={handleSignBridge}
          signing={signingRef.current}
        />
      )}

      {/* Step 4: Verify */}
      {step === 'verify' && attestationUid && (
        <SignetVerify
          attestationUid={attestationUid}
          documentHash={hash}
          isMock={isMockAttestation}
        />
      )}
    </div>
  );
}