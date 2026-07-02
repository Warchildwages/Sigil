// Public API surface for @sigil/sdk

// Main components
export { SignetProvider, useSignetContext } from './SignetProvider.js';
export { SignetWidget } from './SignetWidget.js';

// Individual components (for consumers who want to compose their own UI)
export { StepTracker } from './components/StepTracker.js';
export { SignetUpload } from './components/SignetUpload.js';
export { SignetAnalyze } from './components/SignetAnalyze.js';
export { SignetSign } from './components/SignetSign.js';
export { SignetVerify } from './components/SignetVerify.js';

// Hooks
export { useSignetSession } from './hooks/useSignetSession.js';
export { useSignetApi } from './hooks/useSignetApi.js';

// Design tokens
export { SIGNET_CSS_VARS, cssVarBlock } from './design-tokens.js';
export type { SignetCssVarKey } from './design-tokens.js';

// Types
export type {
  SignetMode,
  SignetPrefillData,
  SignetCircleConfig,
  SignetWidgetProps,
  SignetStep,
  SignetSessionState,
} from './types.js';