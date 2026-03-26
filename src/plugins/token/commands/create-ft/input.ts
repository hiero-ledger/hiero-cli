import { z } from 'zod';

import {
  AmountInputSchema,
  AutoRenewPeriodSecondsSchema,
  ExpirationTimeSchema,
  HtsDecimalsSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  SupplyTypeSchema,
  TokenAliasNameSchema,
  TokenFreezeDefaultSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas';
import { validateSupplyTypeAndMaxSupply } from '@/core/shared/validation/validate-supply.zod';
import { SupplyType } from '@/core/types/shared.types';

/**
 * Input schema for token create command
 * Validates arguments for creating a new fungible token
 */
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
    adminKey: KeySchema.optional().describe(
      'Admin key. Accepts any key format.',
    ),
    supplyKey: KeySchema.optional().describe(
      'Supply key. Accepts any key format.',
    ),
    freezeKey: KeySchema.optional().describe(
      'Freeze key. Accepts any key format.',
    ),
    freezeDefault: TokenFreezeDefaultSchema.describe(
      'When true and a freeze key is set, new token associations are frozen by default. Ignored without a freeze key.',
    ),
    wipeKey: KeySchema.optional().describe('Wipe key. Accepts any key format.'),
    kycKey: KeySchema.optional().describe('KYC key. Accepts any key format.'),
    pauseKey: KeySchema.optional().describe(
      'Pause key. Accepts any key format.',
    ),
    feeScheduleKey: KeySchema.optional().describe(
      'Fee schedule key. Accepts any key format.',
    ),
    metadataKey: KeySchema.optional().describe(
      'Metadata key. Accepts any key format.',
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
      'Auto-renew period: integer seconds, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 1d). Requires auto renew account property.',
    ),
    autoRenewAccount: KeySchema.optional().describe(
      'Account that pays auto-renewal. Required when auto renew period property is set.',
    ),
    expirationTime: ExpirationTimeSchema.describe(
      'Absolute token expiration (ISO 8601), must be after the current time. Ignored when auto-renew period and account are set.',
    ),
  })
  .superRefine(validateSupplyTypeAndMaxSupply);

/** Parsed CLI args (after transforms); use with `TokenCreateFtInputSchema.parse`. */
export type TokenCreateFtInput = z.output<typeof TokenCreateFtInputSchema>;
