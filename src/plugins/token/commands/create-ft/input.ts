import { z } from 'zod';

import {
  AmountInputSchema,
  AutoRenewPeriodSecondsSchema,
  ExpirationTimeSchema,
  HtsDecimalsSchema,
  KeyManagerTypeSchema,
  KeySchema,
  KeyThresholdOptionalSchema,
  MemoSchema,
  OptionalDefaultEmptyKeyListSchema,
  SupplyTypeSchema,
  TokenAliasNameSchema,
  TokenFreezeDefaultSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas';
import { validateSupplyTypeAndMaxSupply } from '@/core/shared/validation/validate-supply.zod';
import { SupplyType } from '@/core/types/shared.types';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';

export const TokenCreateFtInputSchema = z
  .object({
    tokenName: TokenNameSchema.describe('Token name'),
    symbol: TokenSymbolSchema.describe('Token symbol/ticker'),
    treasury: KeySchema.optional().describe(
      'Treasury account. Accepts any key format. Defaults to operator.',
    ),
    decimals: HtsDecimalsSchema.default(0).describe(
      'Token decimals (0-18). Default: 0',
    ),
    initialSupply: AmountInputSchema.default('1000000').describe(
      'Initial supply amount. Default: 1000000 (display units or "t" for base units)',
    ),
    supplyType: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.toUpperCase() : val),
        SupplyTypeSchema.default(SupplyType.INFINITE),
      )
      .describe('Supply type: INFINITE (default) or FINITE'),
    maxSupply: AmountInputSchema.optional().describe(
      'Maximum supply (required for FINITE supply type)',
    ),
    adminKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Optional admin key(s). Pass multiple times for shared administration or M-of-N. Accepts any key format. Omit all for no admin key.',
    ),
    adminKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many admin keys must sign (M-of-N). Only when multiple admin keys are provided.',
    ),
    supplyKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Supply key(s). Pass multiple times for shared mint/burn control or M-of-N. Accepts any key format.',
    ),
    supplyKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many supply keys must sign (M-of-N). Only when multiple supply keys are provided.',
    ),
    freezeKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Freeze key(s). Pass multiple times for shared freeze control or M-of-N. Accepts any key format.',
    ),
    freezeKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many freeze keys must sign (M-of-N). Only when multiple freeze keys are provided.',
    ),
    freezeDefault: TokenFreezeDefaultSchema.describe(
      'When true and a freeze key is set, new token associations are frozen by default. Ignored without a freeze key.',
    ),
    wipeKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Wipe key(s). Pass multiple times for shared wipe control or M-of-N. Accepts any key format.',
    ),
    wipeKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many wipe keys must sign (M-of-N). Only when multiple wipe keys are provided.',
    ),
    kycKey: OptionalDefaultEmptyKeyListSchema.describe(
      'KYC key(s). Pass multiple times for shared KYC control or M-of-N. Accepts any key format.',
    ),
    kycKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many KYC keys must sign (M-of-N). Only when multiple KYC keys are provided.',
    ),
    pauseKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Pause key(s). Pass multiple times for shared pause control or M-of-N. Accepts any key format.',
    ),
    pauseKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many pause keys must sign (M-of-N). Only when multiple pause keys are provided.',
    ),
    feeScheduleKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Fee schedule key(s). Pass multiple times for shared fee-schedule control or M-of-N. Accepts any key format.',
    ),
    feeScheduleKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many fee schedule keys must sign (M-of-N). Only when multiple fee schedule keys are provided.',
    ),
    metadataKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Metadata key(s). Pass multiple times for shared metadata control or M-of-N. Accepts any key format.',
    ),
    metadataKeyThreshold: KeyThresholdOptionalSchema.describe(
      'How many metadata keys must sign (M-of-N). Only when multiple metadata keys are provided.',
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
    autoRenewPeriod: AutoRenewPeriodSecondsSchema.describe(
      'Auto-renew period: integer seconds, or with suffix s/m/h/d.',
    ),
    autoRenewAccount: KeySchema.optional().describe(
      'Account that pays auto-renewal.',
    ),
    expirationTime: ExpirationTimeSchema.describe(
      'Absolute token expiration (ISO 8601).',
    ),
  })
  .superRefine(validateSupplyTypeAndMaxSupply)
  .superRefine((data, context) => {
    applyKeyThresholdSuperRefine(data, context, [
      {
        thresholdField: 'adminKeyThreshold',
        getKeyCount: (row) => row.adminKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'adminKeyThreshold can only be set when multiple admin keys are provided',
          thresholdExceedsKeyCount:
            'adminKeyThreshold must not exceed the number of admin keys provided',
        },
      },
      {
        thresholdField: 'supplyKeyThreshold',
        getKeyCount: (row) => row.supplyKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'supplyKeyThreshold can only be set when multiple supply keys are provided',
          thresholdExceedsKeyCount:
            'supplyKeyThreshold must not exceed the number of supply keys provided',
        },
      },
      {
        thresholdField: 'freezeKeyThreshold',
        getKeyCount: (row) => row.freezeKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'freezeKeyThreshold can only be set when multiple freeze keys are provided',
          thresholdExceedsKeyCount:
            'freezeKeyThreshold must not exceed the number of freeze keys provided',
        },
      },
      {
        thresholdField: 'wipeKeyThreshold',
        getKeyCount: (row) => row.wipeKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'wipeKeyThreshold can only be set when multiple wipe keys are provided',
          thresholdExceedsKeyCount:
            'wipeKeyThreshold must not exceed the number of wipe keys provided',
        },
      },
      {
        thresholdField: 'kycKeyThreshold',
        getKeyCount: (row) => row.kycKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'kycKeyThreshold can only be set when multiple KYC keys are provided',
          thresholdExceedsKeyCount:
            'kycKeyThreshold must not exceed the number of KYC keys provided',
        },
      },
      {
        thresholdField: 'pauseKeyThreshold',
        getKeyCount: (row) => row.pauseKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'pauseKeyThreshold can only be set when multiple pause keys are provided',
          thresholdExceedsKeyCount:
            'pauseKeyThreshold must not exceed the number of pause keys provided',
        },
      },
      {
        thresholdField: 'feeScheduleKeyThreshold',
        getKeyCount: (row) => row.feeScheduleKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'feeScheduleKeyThreshold can only be set when multiple fee schedule keys are provided',
          thresholdExceedsKeyCount:
            'feeScheduleKeyThreshold must not exceed the number of fee schedule keys provided',
        },
      },
      {
        thresholdField: 'metadataKeyThreshold',
        getKeyCount: (row) => row.metadataKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'metadataKeyThreshold can only be set when multiple metadata keys are provided',
          thresholdExceedsKeyCount:
            'metadataKeyThreshold must not exceed the number of metadata keys provided',
        },
      },
    ]);
  });

export type TokenCreateFtInput = z.output<typeof TokenCreateFtInputSchema>;
