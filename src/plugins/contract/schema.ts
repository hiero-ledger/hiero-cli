// Main token data schema
import { z } from 'zod';

import { EntityIdSchema, EvmAddressSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractDataSchema = z.object({
  contractId: EntityIdSchema.describe('Contract ID'),

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  adminPublicKey: z.string().optional(),

  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  memo: z.string().max(100).optional(),
});

// TypeScript type inferred from Zod schema
export type ContractData = z.infer<typeof ContractDataSchema>;
