/**
 * Account Plugin State Schema
 * Single source of truth for account data structure and validation
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas/common-schemas';
import { KeyAlgorithm } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';

// Supported networks aligned with core SupportedNetwork type
export const SUPPORTED_NETWORKS = [
  'mainnet',
  'testnet',
  'previewnet',
  'localnet',
] as const satisfies readonly SupportedNetwork[];

// Zod schema for runtime validation
export const AccountDataSchema = z.object({
  keyRefId: z.string().min(1, 'Key reference ID is required'),
  name: AliasNameSchema.max(50, 'Name must be 50 characters or less'),
  accountId: EntityIdSchema,
  type: z.enum([KeyAlgorithm.ECDSA, KeyAlgorithm.ED25519], {
    errorMap: () => ({ message: 'Type must be either ecdsa or ed25519' }),
  }),
  publicKey: z.string().min(1, 'Public key is required'),
  evmAddress: EvmAddressSchema,
  network: z.enum(SUPPORTED_NETWORKS, {
    errorMap: () => ({
      message: 'Network must be one of: mainnet, testnet, previewnet, localnet',
    }),
  }),
});

// TypeScript type inferred from Zod schema
export type AccountData = z.infer<typeof AccountDataSchema>;

// Namespace constant
export const ACCOUNT_NAMESPACE = 'account-accounts';

// JSON Schema for manifest (automatically generated from Zod schema)
export const ACCOUNT_JSON_SCHEMA = zodToJsonSchema(AccountDataSchema);

/**
 * Validate account data using Zod schema
 */
export function validateAccountData(data: unknown): data is AccountData {
  try {
    AccountDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate account data with detailed error messages
 */
export function parseAccountData(data: unknown): AccountData {
  return AccountDataSchema.parse(data);
}

/**
 * Safe parse account data (returns success/error instead of throwing)
 */
export function safeParseAccountData(data: unknown) {
  return AccountDataSchema.safeParse(data);
}
