import { z } from 'zod';

export const createSignatureSchema = z
  .object({
    documentId: z.string().uuid(),
    entityId: z.string().uuid(),
    roleId: z.string().uuid().nullable().optional(),
    officeholderId: z.string().uuid().nullable().optional(),
    signerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
    signatureProof: z.string().min(1),
    signingMethod: z.enum(['passkey', 'swipe', 'stylus', 'wallet_connect']),
    supplementaryProof: z.string().nullable().optional(),
    chainId: z.number().int().positive(),
  })
  .refine(
    (data) => {
      if (data.signingMethod === 'stylus') {
        return data.supplementaryProof != null && data.supplementaryProof.length > 0;
      }
      return true;
    },
    {
      message: 'supplementaryProof is required when signingMethod is stylus',
      path: ['supplementaryProof'],
    },
  );

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>;