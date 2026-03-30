import { z } from 'zod';

import {
  AmountInputSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  SupplyTypeSchema,
  TokenAliasNameSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas';
import { validateSupplyTypeAndMaxSupply } from '@/core/shared/validation/validate-supply.zod';
import { SupplyType } from '@/core/types/shared.types';

export const TokenCreateNftInputSchema = z
  .object({
    tokenName: TokenNameSchema.describe('Token name'),
    symbol: TokenSymbolSchema.describe('Token symbol/ticker'),
    treasury: KeySchema.optional().describe(
      'Treasury account. Accepts any key format. Defaults to operator.',
    ),
    supplyType: SupplyTypeSchema.default(SupplyType.INFINITE).describe(
      'Supply type: INFINITE (default) or FINITE',
    ),
    maxSupply: AmountInputSchema.optional().describe(
      'Maximum supply (required for FINITE supply type)',
    ),
    adminKey: KeySchema.optional().describe(
      'Admin key. Accepts any key format.',
    ),
    supplyKey: KeySchema.optional().describe(
      'Supply key. Accepts any key format.',
    ),
    freezeKey: KeySchema.optional().describe(
      'Freeze key. Allows freezing token transfers for specific accounts.',
    ),
    wipeKey: KeySchema.optional().describe(
      'Wipe key. Allows wiping token balance from specific accounts.',
    ),
    pauseKey: KeySchema.optional().describe(
      'Pause key. Allows pausing all token transfers.',
    ),
    kycKey: KeySchema.optional().describe(
      'KYC key. Allows granting/revoking KYC status.',
    ),
    feeScheduleKey: KeySchema.optional().describe(
      'Fee schedule key. Allows modifying custom fees.',
    ),
    metadataKey: KeySchema.optional().describe(
      'Metadata key. Allows updating token metadata.',
    ),
    freezeDefault: z
      .boolean()
      .optional()
      .describe(
        'Default freeze status for new token associations. Requires freezeKey.',
      ),
    autoRenewPeriod: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Auto-renew period in seconds (e.g. 7776000 for 90 days).'),
    autoRenewAccountId: EntityIdSchema.optional().describe(
      'Account ID that pays for token auto-renewal fees (e.g. 0.0.12345).',
    ),
    expirationTime: z.iso
      .datetime()
      .optional()
      .describe(
        'Token expiration time in ISO 8601 format (e.g. 2027-01-01T00:00:00Z).',
      ),
    name: TokenAliasNameSchema.optional().describe(
      'Optional alias to register for the token',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
    memo: MemoSchema.describe(
      'Optional memo for the token (max 100 characters)',
    ),
  })
  .superRefine(validateSupplyTypeAndMaxSupply)
  .superRefine((data, ctx) => {
    if (data.freezeDefault !== undefined && !data.freezeKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'freezeDefault requires freezeKey to be set',
        path: ['freezeDefault'],
      });
    }
  });

export type TokenCreateNftInput = z.infer<typeof TokenCreateNftInputSchema>;
