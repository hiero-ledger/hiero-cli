/**
 * Delete Account Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Delete Account Command Output Schema
 */
export const DeleteAccountOutputSchema = z.object({
  deletedAccount: z.object({
    name: z.string().describe('Account name or alias').optional(),
    accountId: EntityIdSchema,
  }),
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  network: NetworkSchema,
});

export type DeleteAccountOutput = z.infer<typeof DeleteAccountOutputSchema>;

/**
 * Human-readable template for delete account output
 */
export const DELETE_ACCOUNT_TEMPLATE = `
{{#if removedAliases}}
✅ Account deleted successfully: {{deletedAccount.name}} ({{hashscanLink deletedAccount.accountId "account" network}})
{{else}}
✅ Account deleted successfully: {{hashscanLink deletedAccount.accountId "account" network}}
{{/if}}
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
