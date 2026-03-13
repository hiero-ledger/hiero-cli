/**
 * Delete Token Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Delete Token Command Output Schema
 */
export const TokenDeleteOutputSchema = z.object({
  deletedToken: z.object({
    name: z.string().describe('Token name'),
    tokenId: EntityIdSchema,
  }),
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  network: NetworkSchema,
});

export type TokenDeleteOutput = z.infer<typeof TokenDeleteOutputSchema>;

/**
 * Human-readable template for delete token output
 */
export const TOKEN_DELETE_TEMPLATE = `
✅ Token deleted successfully: {{deletedToken.name}} ({{hashscanLink deletedToken.tokenId "token" network}})
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
