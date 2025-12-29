import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const MemoTestOutputSchema = z.object({
  memo: z.string().describe('Memo for an account'),
  account: AliasNameSchema.describe('Account alias'),
});

export type MemoTestOutput = z.infer<typeof MemoTestOutputSchema>;

export const MEMO_TEST_TEMPLATE = `
📝 Memo {{memo}} saved for an account {{account}}
`.trim();
