import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin from filesystem path
 */
export const MemoTestInputSchema = z.object({
  memo: z
    .string()
    .max(100, 'Memo should have maximum of 100 characters')
    .describe('Memo to save for an account. Max size should be 100 characters'),
  account: AliasNameSchema.describe('Alias for memo.'),
});

export type MemoTestInput = z.infer<typeof MemoTestInputSchema>;
