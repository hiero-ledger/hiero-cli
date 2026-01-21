import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TransferNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  serials: NftSerialNumbersSchema,
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferNftInput = z.infer<typeof TransferNftInputSchema>;
