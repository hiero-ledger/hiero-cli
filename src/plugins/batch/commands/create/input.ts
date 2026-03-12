import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  PrivateKeySchema,
} from '@/core/schemas';

/**
 * Input schema for batch create command
 */
export const CreateBatchInputSchema = z.object({
  name: AliasNameSchema.describe('Batch name'),
  key: PrivateKeySchema.optional().describe(
    'Key to sign transactions in the batch. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type CreateBatchInput = z.infer<typeof CreateBatchInputSchema>;
