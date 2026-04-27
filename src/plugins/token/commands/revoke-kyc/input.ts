import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas/common-schemas';

export const TokenRevokeKycInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  account: AccountReferenceObjectSchema.describe(
    'Account to revoke KYC (ID, alias, or EVM address)',
  ),
  kycKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token KYC key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenRevokeKycInput = z.infer<typeof TokenRevokeKycInputSchema>;
