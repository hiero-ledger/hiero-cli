import { z } from 'zod';
import {
  AccountReferenceSchema,
  EntityIdSchema,
  EntityReferenceSchema,
} from '../../../../core/schemas';

/**
 * Input schema for account balance command
 * Validates arguments for retrieving account balance
 */

export enum TokenEntityType {
  Token = 'token',
  Alias = 'alias',
}

const TokenEntityReferenceSchema = EntityReferenceSchema.optional()
  .transform((val) => {
    if (val) {
      return {
        type: EntityIdSchema.safeParse(val).success
          ? TokenEntityType.Token
          : TokenEntityType.Alias,
        value: val,
      };
    } else {
      return;
    }
  })
  .describe('Optional specific token to query (ID or name)');

export const AccountBalanceInputSchema = z
  .object({
    account: AccountReferenceSchema.describe(
      'Account identifier (ID, EVM address, or name)',
    ),
    hbarOnly: z
      .boolean()
      .default(false)
      .describe('Show only HBAR balance (exclude tokens)'),
    token: TokenEntityReferenceSchema,
    raw: z
      .boolean()
      .default(false)
      .describe(
        'Display balances in raw units (tinybars for HBAR, base units for tokens)',
      ),
  })
  .refine((data) => !(data.hbarOnly && data.token !== undefined), {
    message: 'Cannot use both hbarOnly and token options at the same time',
  });

export type AccountBalanceInput = z.infer<typeof AccountBalanceInputSchema>;
