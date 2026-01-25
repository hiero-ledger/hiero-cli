import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

/**
 * Input schema for history list command
 * Validates arguments for listing transaction history
 */
export const ListHistoryInputSchema = z.object({
  account: AccountReferenceSchema.describe(
    'Account ID, EVM address, or name to get history for',
  ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe('Maximum number of transactions to return (1-100, default 25)'),
  type: z
    .enum([
      'all',
      'cryptotransfer',
      'cryptoapproveallowance',
      'tokenassociate',
      'tokendissociate',
      'tokentransfers',
      'contractcall',
      'contractcreate',
    ])
    .optional()
    .describe('Filter by transaction type'),
  result: z
    .enum(['all', 'success', 'fail'])
    .optional()
    .default('all')
    .describe('Filter by transaction result'),
});

export type ListHistoryInput = z.infer<typeof ListHistoryInputSchema>;
