import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TokenTransferNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: KeySchema.optional().describe(
    'Source account. Can be {accountID}:{privateKey} pair, key reference or account alias. Defaults to operator.',
  ),
  serials: NftSerialNumbersSchema,
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenTransferNftInput = z.infer<typeof TokenTransferNftInputSchema>;
