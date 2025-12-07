import { z } from 'zod';
import {
  AccountReferenceSchema,
  EntityReferenceSchema,
} from '../../../../core/schemas';

/**
 * Input schema for account balance command
 * Validates arguments for retrieving account balance
 */

export const TokenEntityType = {
  Token: 'token',
  Alias: 'alias',
} as const;

export type TokenEntityType =
  (typeof TokenEntityType)[keyof typeof TokenEntityType];

const TokenEntityReferenceSchema = EntityReferenceSchema.optional()
  .transform((val) => {
    if (val) {
      if (val.match(/^0\.0\.[1-9][0-9]*$/)) {
        return {
          type: TokenEntityType.Token,
          value: val,
        };
      } else {
        return {
          type: TokenEntityType.Alias,
          value: val,
        };
      }
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
  })
  .refine((data) => !(data.hbarOnly && data.token !== undefined), {
    message: 'Cannot use both hbarOnly and token options at the same time',
  });

export type AccountBalanceInput = z.infer<typeof AccountBalanceInputSchema>;
