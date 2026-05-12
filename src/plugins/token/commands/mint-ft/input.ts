import { z } from 'zod';

import {
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

/**
 * Input schema for token mint-ft command
 * Validates arguments for minting fungible tokens
 */
export const TokenMintFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  amount: AmountInputSchema.describe(
    'Amount to mint (display units or base units with "t" suffix)',
  ),
  supplyKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Credential(s) that can sign as the token supply. Pass multiple times when the supply policy requires more than one signature (M-of-N). Same formats as other CLI key options.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenMintFtInput = z.infer<typeof TokenMintFtInputSchema>;
