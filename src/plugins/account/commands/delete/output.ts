/**
 * Delete Account Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Delete Account Command Output Schema
 */
export const AccountDeleteOutputSchema = z.object({
  deletedAccount: z.object({
    name: z.string().describe('Account name or alias').optional(),
    accountId: EntityIdSchema,
  }),
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  network: NetworkSchema,
  transactionId: z
    .string()
    .describe('Hedera transaction ID when deleted on network')
    .optional(),
  stateOnly: z
    .boolean()
    .describe('True when only local state was removed')
    .optional(),
});

export type AccountDeleteOutput = z.infer<typeof AccountDeleteOutputSchema>;

/**
 * Human-readable template for delete account output
 */
export const ACCOUNT_DELETE_TEMPLATE = `
{{#if stateOnly}}
✅ Account removed from local state only: {{hashscanLink deletedAccount.accountId "account" network}}
{{else}}
{{#if transactionId}}
✅ Account deleted on network: {{hashscanLink transactionId "transaction" network}}
{{else}}
✅ Account deleted successfully: {{hashscanLink deletedAccount.accountId "account" network}}
{{/if}}
{{/if}}
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
