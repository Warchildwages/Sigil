export type StirlingOperation = 'pdf-to-text' | 'pdf-to-markdown' | 'ocr-pdf';

export interface StirlingPipelineResult {
  operation: StirlingOperation;
  success: boolean;
  text?: string;
  markdown?: string;
  ocrApplied: boolean;
  error?: string;
  processingTimeMs: number;
}