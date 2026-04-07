import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas';

/**
 * Input schema for contract import command
 * Validates arguments for importing an existing contract
 */
export const ContractImportInputSchema = z.object({
  contract: z
    .union([EntityIdSchema, EvmAddressSchema])
    .describe(
      'Contract ID (0.0.xxx) or EVM address (0x...) to import from Hedera network',
    ),
  name: AliasNameSchema.optional(),
  verified: z
    .boolean()
    .default(false)
    .describe(
      'Whether the contract was verified on Hashscan. Defaults to false.',
    ),
});

export type ContractImportInput = z.infer<typeof ContractImportInputSchema>;
