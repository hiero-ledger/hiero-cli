import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const AccountUpdateOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  updatedFields: z.array(z.string()),
});

export type AccountUpdateOutput = z.infer<typeof AccountUpdateOutputSchema>;

export const ACCOUNT_UPDATE_TEMPLATE = `
✅ Account updated successfully: {{hashscanLink accountId "account" network}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
   Updated fields: {{#each updatedFields}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
`.trim();
