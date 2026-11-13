/**
 * Account Plugin State Schema
 * Single source of truth for account data structure and validation
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas/common-schemas';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

/** How an account entered local state. */
export const AccountOriginSchema = z.enum(['created', 'imported']);

export type AccountOrigin = z.infer<typeof AccountOriginSchema>;

// Zod schema for runtime validation
export const AccountDataSchema = z.object({
  keyRefId: z.string().min(1, 'Key reference ID is required'),
  name: AliasNameSchema.max(
    50,
    'Name must be 50 characters or less',
  ).optional(),
  accountId: EntityIdSchema,
  type: z.enum([KeyAlgorithm.ECDSA, KeyAlgorithm.ED25519], {
    error: () => ({ message: 'Type must be either ecdsa or ed25519' }),
  }),
  publicKey: z.string().min(1, 'Public key is required'),
  evmAddress: EvmAddressSchema,
  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be one of: mainnet, testnet, previewnet, localnet',
    }),
  }),
  // Optional: state written by older CLI versions has no such field and must
  // keep working, being read back as `created`.
  origin: AccountOriginSchema.optional(),
});

// TypeScript type inferred from Zod schema
export type AccountData = z.infer<typeof AccountDataSchema>;

/**
 * Safe parse account data (returns success/error instead of throwing)
 */
export function safeParseAccountData(data: unknown) {
  return AccountDataSchema.safeParse(data);
}
