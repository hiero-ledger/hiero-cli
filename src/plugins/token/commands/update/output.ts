import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenUpdateOutputSchema = z.object({
  tokenId: EntityIdSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  updatedFields: z.array(z.string()),
});

export type TokenUpdateOutput = z.infer<typeof TokenUpdateOutputSchema>;

export const TOKEN_UPDATE_TEMPLATE = `
✅ Token updated successfully: {{hashscanLink tokenId "token" network}}
   Network: {{network}}
   Updated: {{updatedFields}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
