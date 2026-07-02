import { z } from 'zod';

export const createEntitySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    'individual',
    'corporation',
    'elected_office',
    'department',
    'government_agency',
    'presidential_office',
    'legislature',
  ]),
  parentEntityId: z.string().uuid().nullable().optional(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;

export const createRoleSchema = z.object({
  entityId: z.string().uuid(),
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const createOfficeholderSchema = z.object({
  roleId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  displayName: z.string().min(1).max(100),
  termStart: z.string().datetime().or(z.date()),
  termEnd: z.string().datetime().or(z.date()).nullable().optional(),
});

export type CreateOfficeholderInput = z.infer<typeof createOfficeholderSchema>;