import { createContext, useContext, useMemo } from 'react';
import type { SignetCircleConfig, SignetMode, SignetPrefillData } from './types.js';
import { cssVarBlock } from './design-tokens.js';

interface SignetProviderValue {
  entityId: string;
  apiBaseUrl: string;
  mode: SignetMode;
  prefillData?: SignetPrefillData;
  circleConfig?: SignetCircleConfig;
  onAttested?: (uid: string, txHash: string) => void;
  onError?: (error: Error) => void;
}

const SignetContext = createContext<SignetProviderValue | null>(null);

export function useSignetContext(): SignetProviderValue {
  const ctx = useContext(SignetContext);
  if (!ctx) throw new Error('useSignetContext must be used within <SignetProvider>');
  return ctx;
}

interface SignetProviderProps extends SignetProviderValue {
  children: React.ReactNode;
  className?: string;
}

export function SignetProvider({
  entityId,
  apiBaseUrl,
  mode,
  prefillData,
  circleConfig,
  onAttested,
  onError,
  children,
  className,
}: SignetProviderProps) {
  const value = useMemo<SignetProviderValue>(
    () => ({ entityId, apiBaseUrl, mode, prefillData, circleConfig, onAttested, onError }),
    [entityId, apiBaseUrl, mode, prefillData, circleConfig, onAttested, onError],
  );

  return (
    <SignetContext.Provider value={value}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: CSS variables are static tokens */}
      <style dangerouslySetInnerHTML={{ __html: `.signet-widget { ${cssVarBlock()} }` }} />
      <div className={`signet-widget ${className ?? ''}`}>
        {children}
      </div>
    </SignetContext.Provider>
  );
}