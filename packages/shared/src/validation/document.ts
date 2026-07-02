import { z } from 'zod';
import { SUPPORTED_CHAINS } from '../types/chains.js';

const supportedChainIds = SUPPORTED_CHAINS.map((c) => c.chainId) as [number, ...number[]];

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  contentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a SHA-256 hex string'),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg',
  ]),
  privacyMode: z.enum(['public', 'semi_private', 'fully_private']),
  chainId: z.number().refine((id) => SUPPORTED_CHAINS.some((c) => c.chainId === id), {
    message: 'Unsupported chain ID',
  }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  contentUri: z.string().url().nullable().optional(),
  status: z
    .enum(['draft', 'pending_signatures', 'signed', 'attested', 'amended', 'revoked'])
    .optional(),
  privacyMode: z.enum(['public', 'semi_private', 'fully_private']).optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;