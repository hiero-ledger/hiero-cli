import { z } from 'zod';

import {
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  PrivateKeySchema,
} from '@/core/schemas';

/**
 * Input schema for token mint-ft command
 * Validates arguments for minting fungible tokens
 */
export const MintFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  amount: AmountInputSchema.describe(
    'Amount to mint (display units or base units with "t" suffix)',
  ),
  supplyKey: PrivateKeySchema.describe(
    'Supply key. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type MintFtInput = z.infer<typeof MintFtInputSchema>;
