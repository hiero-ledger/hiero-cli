import { z } from 'zod';

import {
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  PrivateKeySchema,
  PrivateKeyWithAccountIdSchema,
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
    treasury: PrivateKeyWithAccountIdSchema.optional().describe(
      'Treasury account of token. Can be {accountId}:{privateKey} pair, key reference or account alias. Defaults to operator key.',
    ),
    supplyType: SupplyTypeSchema.default(SupplyType.INFINITE).describe(
      'Supply type: INFINITE (default) or FINITE',
    ),
    maxSupply: AmountInputSchema.optional().describe(
      'Maximum supply (required for FINITE supply type)',
    ),
    adminKey: PrivateKeySchema.optional().describe(
      'Admin key of token. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias. Defaults to operator key.',
    ),
    supplyKey: KeySchema.optional().describe(
      'Supply key of token. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:{public-key} format, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias. Defaults to operator key.',
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
