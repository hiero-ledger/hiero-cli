import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  NftSerialNumbersSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenWipeNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: AccountReferenceObjectSchema.describe(
    'Account to wipe from (ID, alias, or EVM address)',
  ),
  serials: NftSerialNumbersSchema.describe(
    'Comma-separated serial numbers to wipe (max 10)',
  ),
  wipeKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token wipe key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenWipeNftInput = z.infer<typeof TokenWipeNftInputSchema>;
