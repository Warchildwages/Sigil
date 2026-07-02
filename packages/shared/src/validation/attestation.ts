import { z } from 'zod';

export const createAttestationSchema = z.object({
  documentId: z.string().uuid(),
  protocol: z.enum(['EAS', 'ArcaneVM', 'Avalanche_Subnet', 'Solana_Attestation']).default('EAS'),
  protocolUid: z.string().min(1),
  schemaUid: z.string().min(1),
  attester: z.string().min(1),
  recipient: z.string().min(1),
  data: z.string().min(1),
  privacyMode: z.enum(['public', 'semi_private', 'fully_private']).default('public'),
  chainId: z.number().int().positive(),
  blockNumber: z.number().int().positive().nullable().optional(),
  transactionHash: z.string().nullable().optional(),
  memoId: z.string().nullable().optional(),
  memoIndex: z.string().nullable().optional(),
});

export type CreateAttestationInput = z.infer<typeof createAttestationSchema>;
