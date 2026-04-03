/**
 * Contract Plugin State Schema
 * Single source of truth for contract data structure and validation
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractDataSchema = z.object({
  contractId: EntityIdSchema.describe('Contract ID'),
  name: AliasNameSchema.optional(),

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  adminPublicKey: z.string().optional(),
  adminKeyRefId: z
    .string()
    .optional()
    .describe('KMS key ref for contract admin when set at create'),

  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  memo: z.string().max(100).optional(),
  verified: z.boolean().optional(),
});

// TypeScript type inferred from Zod schema
export type ContractData = z.infer<typeof ContractDataSchema>;
