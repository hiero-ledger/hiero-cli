import { z } from 'zod';

import {
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
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
export const CreateNftInputSchema = z
  .object({
    tokenName: TokenNameSchema.describe('Token name'),
    symbol: TokenSymbolSchema.describe('Token symbol/ticker'),
    treasury: KeyOrAccountAliasSchema.optional().describe(
      'Treasury account. Can be alias or TreasuryID:treasuryKey pair. Defaults to operator.',
    ),
    supplyType: SupplyTypeSchema.default(SupplyType.INFINITE).describe(
      'Supply type: INFINITE (default) or FINITE',
    ),
    maxSupply: AmountInputSchema.optional().describe(
      'Maximum supply (required for FINITE supply type)',
    ),
    adminKey: KeyOrAccountAliasSchema.optional().describe(
      'Admin key as account name or {accountId}:{private_key} format. If not set, operator key is used.',
    ),
    supplyKey: KeyOrAccountAliasSchema.optional().describe(
      'Supply key as account name or {accountId}:{private_key} format. If not set, operator key is used.',
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
  .superRefine(validateSupplyTypeAndMaxSupply);

export type CreateNftInput = z.infer<typeof CreateNftInputSchema>;
