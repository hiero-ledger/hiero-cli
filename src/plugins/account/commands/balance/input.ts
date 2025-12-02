import { z } from 'zod';
import {
  AccountReferenceSchema,
  EntityReferenceSchema,
} from '../../../../core/schemas';

/**
 * Input schema for account balance command
 * Validates arguments for retrieving account balance
 */
export const AccountBalanceInputSchema = z
  .object({
    account: AccountReferenceSchema.describe(
      'Account identifier (ID, EVM address, or name)',
    ),
    hbarOnly: z
      .boolean()
      .default(false)
      .describe('Show only HBAR balance (exclude tokens)'),
    token: EntityReferenceSchema.optional().describe(
      'Optional specific token to query (ID or name)',
    ),
  })
  .refine((data) => !(data.hbarOnly && data.token !== undefined), {
    message: 'Cannot use both hbarOnly and token options at the same time',
  });

export type AccountBalanceInput = z.infer<typeof AccountBalanceInputSchema>;
