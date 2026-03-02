import { z } from 'zod';

import {
  AliasNameSchema,
  ContractNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas';

/**
 * Input schema for contract import command
 * Validates arguments for importing an existing contract
 */
export const ImportContractInputSchema = z.object({
  contract: z
    .union([EntityIdSchema, EvmAddressSchema])
    .describe(
      'Contract ID (0.0.xxx) or EVM address (0x...) to import from Hedera network',
    ),
  alias: AliasNameSchema.optional().describe(
    'Optional contract alias for the imported contract',
  ),
  name: ContractNameSchema.optional().describe(
    'Optional contract name for the imported contract',
  ),
  verified: z
    .boolean()
    .default(false)
    .describe(
      'Whether the contract was verified on Hashscan. Defaults to false.',
    ),
});

export type ImportContractInput = z.infer<typeof ImportContractInputSchema>;
