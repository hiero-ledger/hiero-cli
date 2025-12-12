import { z } from 'zod';
import {
  AmountInputSchema,
  HtsDecimalsSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
  SupplyTypeSchema,
  TokenAliasNameSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '../../../../core/schemas';
import { validateSupplyTypeAndMaxSupply } from '../../../../core/shared/validation/validate-supply.zod';

/**
 * Input schema for token create command
 * Validates arguments for creating a new fungible token
 */
export const CreateTokenInputSchema = z
  .object({
    tokenName: TokenNameSchema.describe('Token name'),
    symbol: TokenSymbolSchema.describe('Token symbol/ticker'),
    treasury: KeyOrAccountAliasSchema.optional().describe(
      'Treasury account. Can be alias or TreasuryID:treasuryKey pair. Defaults to operator.',
    ),
    decimals: HtsDecimalsSchema.default(0).describe(
      'Token decimals (0-18). Default: 0',
    ),
    initialSupply: AmountInputSchema.default('1000000').describe(
      'Initial supply amount. Default: 1000000 (display units or "t" for base units)',
    ),
    supplyType: SupplyTypeSchema.default('INFINITE').describe(
      'Supply type: INFINITE (default) or FINITE',
    ),
    maxSupply: AmountInputSchema.optional().describe(
      'Maximum supply (required for FINITE supply type)',
    ),
    adminKey: KeyOrAccountAliasSchema.optional().describe(
      'Admin key (optional). If not set, operator key is used as admin key.',
    ),
    name: TokenAliasNameSchema.optional().describe(
      'Optional alias to register for the token',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
  })
  .superRefine(validateSupplyTypeAndMaxSupply);

export type CreateTokenInput = z.infer<typeof CreateTokenInputSchema>;
