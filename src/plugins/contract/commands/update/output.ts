import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const ContractUpdateOutputSchema = z.object({
  contractId: EntityIdSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  updatedFields: z.array(z.string()),
});

export type ContractUpdateOutput = z.infer<typeof ContractUpdateOutputSchema>;

export const CONTRACT_UPDATE_TEMPLATE = `
✅ Contract updated successfully: {{hashscanLink contractId "contract" network}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
   Updated fields: {{#each updatedFields}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
`.trim();
