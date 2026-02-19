import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  NftSerialNumbersSchema,
  PrivateKeyWithAccountIdSchema,
} from '@/core/schemas';

export const TransferNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: PrivateKeyWithAccountIdSchema.optional().describe(
    'Source account. Can be {accountID}:{privateKey} pair, key reference or account alias. Defaults to operator.',
  ),
  serials: NftSerialNumbersSchema,
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferNftInput = z.infer<typeof TransferNftInputSchema>;
