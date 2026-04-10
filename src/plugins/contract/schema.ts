/**
 * Contract Plugin State Schema
 * Single source of truth for contract data structure and validation
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
  KeyRefIdArraySchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractDataSchema = z.object({
  contractId: EntityIdSchema.describe('Contract ID'),
  name: AliasNameSchema.optional(),

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  adminKeyRefIds: KeyRefIdArraySchema,
  adminKeyThreshold: z.number().int().min(0).default(0),

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
