import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenDeleteOutputSchema = z.object({
  transactionId: TransactionIdSchema.optional(),
  deletedToken: z.object({
    name: z.string().describe('Token name'),
    tokenId: EntityIdSchema,
  }),
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  network: NetworkSchema,
});

export type TokenDeleteOutput = z.infer<typeof TokenDeleteOutputSchema>;

export const TOKEN_DELETE_TEMPLATE = `
✅ Token deleted successfully!
   Token: {{deletedToken.name}} ({{hashscanLink deletedToken.tokenId "token" network}})
{{#if transactionId}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
{{/if}}
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
