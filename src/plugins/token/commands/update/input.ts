import { z } from 'zod';

import {
  AccountReferenceSchema,
  AutoRenewPeriodSecondsSchema,
  EntityReferenceSchema,
  ExpirationTimeSchema,
  KeyManagerTypeSchema,
  KeySchema,
  KeyThresholdOptionalSchema,
  MemoSchema,
  NullLiteralSchema,
  OptionalDefaultEmptyKeyListSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas';
import { isNullOrNonEmpty } from '@/core/utils/is-null-or-non-empty';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';

const TokenUpdateInputObjectSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias to update'),
  tokenName: TokenNameSchema.optional().describe('New token name'),
  symbol: TokenSymbolSchema.optional().describe('New token symbol'),
  treasury: AccountReferenceSchema.optional().describe(
    'New treasury account ID or alias',
  ),
  adminKeys: OptionalDefaultEmptyKeyListSchema.describe(
    'Current admin key(s) for signing. Omit to auto-resolve from key manager.',
  ),
  adminKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: how many current admin keys to use for signing.',
  ),
  newAdminKeys: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New admin key(s) to replace the current admin key. Accepts any key format. Pass "null" to clear.',
    ),
  newAdminKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of new admin keys required to sign (only when multiple --new-admin-keys are set).',
  ),
  currentTreasuryKey: KeySchema.optional().describe(
    'Signing key for the new treasury account. Omit to auto-resolve from key manager.',
  ),
  kycKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe('New KYC key(s). Pass "null" to permanently remove the KYC key.'),
  kycKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of KYC keys required to sign.',
  ),
  freezeKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New freeze key(s). Pass "null" to permanently remove the freeze key.',
    ),
  freezeKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of freeze keys required to sign.',
  ),
  wipeKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New wipe key(s). Pass "null" to permanently remove the wipe key.',
    ),
  wipeKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of wipe keys required to sign.',
  ),
  supplyKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New supply key(s). Pass "null" to permanently remove the supply key.',
    ),
  supplyKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of supply keys required to sign.',
  ),
  feeScheduleKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New fee schedule key(s). Pass "null" to permanently remove the fee schedule key.',
    ),
  feeScheduleKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of fee schedule keys required to sign.',
  ),
  pauseKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New pause key(s). Pass "null" to permanently remove the pause key.',
    ),
  pauseKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of pause keys required to sign.',
  ),
  metadataKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe(
      'New metadata key(s). Pass "null" to permanently remove the metadata key.',
    ),
  metadataKeyThreshold: KeyThresholdOptionalSchema.describe(
    'M-of-N: number of metadata keys required to sign.',
  ),
  memo: MemoSchema.or(NullLiteralSchema)
    .optional()
    .describe('New memo for the token. Pass "null" to clear.'),
  autoRenewAccount: AccountReferenceSchema.optional().describe(
    'New auto-renew account ID or alias.',
  ),
  autoRenewPeriod: AutoRenewPeriodSecondsSchema.optional().describe(
    'New auto-renew period: seconds as integer (30–92 days), or with suffix s/m/h/d.',
  ),
  expirationTime: ExpirationTimeSchema.optional().describe(
    'New expiration time as ISO 8601 string. Can be set without admin key when it is the only change.',
  ),
  metadata: z
    .string()
    .optional()
    .describe('Token metadata (UTF-8 string, max 100 bytes).'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting).',
  ),
});

type TokenUpdateInputData = z.infer<typeof TokenUpdateInputObjectSchema>;

function validateHasAnyUpdate(
  data: TokenUpdateInputData,
  context: z.RefinementCtx,
): void {
  const hasAnyUpdate =
    data.tokenName !== undefined ||
    data.symbol !== undefined ||
    data.treasury !== undefined ||
    data.newAdminKeys.length > 0 ||
    isNullOrNonEmpty(data.kycKey) ||
    isNullOrNonEmpty(data.freezeKey) ||
    isNullOrNonEmpty(data.wipeKey) ||
    isNullOrNonEmpty(data.supplyKey) ||
    isNullOrNonEmpty(data.feeScheduleKey) ||
    isNullOrNonEmpty(data.pauseKey) ||
    isNullOrNonEmpty(data.metadataKey) ||
    data.memo !== undefined ||
    data.autoRenewAccount !== undefined ||
    data.autoRenewPeriod !== undefined ||
    data.expirationTime !== undefined ||
    data.metadata !== undefined;

  if (!hasAnyUpdate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field to update must be provided',
      path: ['token'],
    });
  }
}

function validateKeyThresholds(
  data: TokenUpdateInputData,
  context: z.RefinementCtx,
): void {
  const newAdminKeyCount = Array.isArray(data.newAdminKeys)
    ? data.newAdminKeys.length
    : 0;
  const kycKeyCount = Array.isArray(data.kycKey) ? data.kycKey.length : 0;
  const freezeKeyCount = Array.isArray(data.freezeKey)
    ? data.freezeKey.length
    : 0;
  const wipeKeyCount = Array.isArray(data.wipeKey) ? data.wipeKey.length : 0;
  const supplyKeyCount = Array.isArray(data.supplyKey)
    ? data.supplyKey.length
    : 0;
  const feeScheduleKeyCount = Array.isArray(data.feeScheduleKey)
    ? data.feeScheduleKey.length
    : 0;
  const pauseKeyCount = Array.isArray(data.pauseKey) ? data.pauseKey.length : 0;
  const metadataKeyCount = Array.isArray(data.metadataKey)
    ? data.metadataKey.length
    : 0;

  applyKeyThresholdSuperRefine(data, context, [
    {
      thresholdField: 'adminKeyThreshold',
      getKeyCount: () => data.adminKeys.length,
      messages: {
        thresholdWithoutEnoughKeys:
          'adminKeyThreshold requires at least 2 admin keys',
        thresholdExceedsKeyCount:
          'adminKeyThreshold must not exceed the number of admin keys provided',
      },
    },
    {
      thresholdField: 'newAdminKeyThreshold',
      getKeyCount: () => newAdminKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'newAdminKeyThreshold requires at least 2 new admin keys',
        thresholdExceedsKeyCount:
          'newAdminKeyThreshold must not exceed the number of new admin keys provided',
      },
    },
    {
      thresholdField: 'kycKeyThreshold',
      getKeyCount: () => kycKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'kycKeyThreshold requires at least 2 KYC keys',
        thresholdExceedsKeyCount:
          'kycKeyThreshold must not exceed the number of KYC keys provided',
      },
    },
    {
      thresholdField: 'freezeKeyThreshold',
      getKeyCount: () => freezeKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'freezeKeyThreshold requires at least 2 freeze keys',
        thresholdExceedsKeyCount:
          'freezeKeyThreshold must not exceed the number of freeze keys provided',
      },
    },
    {
      thresholdField: 'wipeKeyThreshold',
      getKeyCount: () => wipeKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'wipeKeyThreshold requires at least 2 wipe keys',
        thresholdExceedsKeyCount:
          'wipeKeyThreshold must not exceed the number of wipe keys provided',
      },
    },
    {
      thresholdField: 'supplyKeyThreshold',
      getKeyCount: () => supplyKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'supplyKeyThreshold requires at least 2 supply keys',
        thresholdExceedsKeyCount:
          'supplyKeyThreshold must not exceed the number of supply keys provided',
      },
    },
    {
      thresholdField: 'feeScheduleKeyThreshold',
      getKeyCount: () => feeScheduleKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'feeScheduleKeyThreshold requires at least 2 fee schedule keys',
        thresholdExceedsKeyCount:
          'feeScheduleKeyThreshold must not exceed the number of fee schedule keys provided',
      },
    },
    {
      thresholdField: 'pauseKeyThreshold',
      getKeyCount: () => pauseKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'pauseKeyThreshold requires at least 2 pause keys',
        thresholdExceedsKeyCount:
          'pauseKeyThreshold must not exceed the number of pause keys provided',
      },
    },
    {
      thresholdField: 'metadataKeyThreshold',
      getKeyCount: () => metadataKeyCount,
      messages: {
        thresholdWithoutEnoughKeys:
          'metadataKeyThreshold requires at least 2 metadata keys',
        thresholdExceedsKeyCount:
          'metadataKeyThreshold must not exceed the number of metadata keys provided',
      },
    },
  ]);
}

export const TokenUpdateInputSchema = TokenUpdateInputObjectSchema.superRefine(
  (data, context) => {
    validateHasAnyUpdate(data, context);
    validateKeyThresholds(data, context);
  },
);

export type TokenUpdateInput = z.infer<typeof TokenUpdateInputSchema>;
