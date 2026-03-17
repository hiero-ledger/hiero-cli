import { z } from 'zod';

import {
  AmountInputSchema,
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

/**
 * Input schema for token create command
 * Validates arguments for creating a new fungible token
 */
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
    supplyKey: KeySchema.describe('Supply key. Accepts any key format.'),
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
  .superRefine(validateSupplyTypeAndMaxSupply);

export type TokenCreateNftInput = z.infer<typeof TokenCreateNftInputSchema>;
