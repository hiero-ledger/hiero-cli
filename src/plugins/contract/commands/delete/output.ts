/**
 * Delete Contract Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Delete Contract Command Output Schema
 */
export const DeleteContractOutputSchema = z.object({
  deletedContract: z.object({
    contractId: EntityIdSchema,
    name: z.string().optional(),
  }),
  network: NetworkSchema,
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  transactionId: z
    .string()
    .describe('Hedera transaction ID when deleted on network')
    .optional(),
  stateOnly: z
    .boolean()
    .describe('True when only local state was removed')
    .optional(),
});

export type ContractDeleteOutput = z.infer<typeof DeleteContractOutputSchema>;

/**
 * Human-readable template for delete contract output
 */
export const DELETE_CONTRACT_TEMPLATE = `
{{#if stateOnly}}
✅ Contract removed from local state only: {{deletedContract.contractId}}{{#if deletedContract.name}} ({{deletedContract.name}}){{/if}} ({{hashscanLink deletedContract.contractId "contract" network}})
{{else}}
{{#if transactionId}}
✅ Contract deleted on network: {{hashscanLink transactionId "transaction" network}}
{{else}}
✅ Contract deleted successfully: {{deletedContract.contractId}}{{#if deletedContract.name}} ({{deletedContract.name}}){{/if}} ({{hashscanLink deletedContract.contractId "contract" network}})
{{/if}}
{{/if}}
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
