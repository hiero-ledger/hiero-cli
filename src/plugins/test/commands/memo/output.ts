import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const TestMemoOutputSchema = z.object({
  memo: z.string().describe('Memo for an account'),
  account: AliasNameSchema.describe('Account alias'),
});

export type TestMemoOutput = z.infer<typeof TestMemoOutputSchema>;

export const TEST_MEMO_TEMPLATE = `
📝 Memo {{memo}} saved for an account {{account}}
`.trim();
