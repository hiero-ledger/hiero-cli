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
    contractName: z.string().optional(),
  }),
  network: NetworkSchema,
});

export type DeleteContractOutput = z.infer<typeof DeleteContractOutputSchema>;

/**
 * Human-readable template for delete contract output
 */
export const DELETE_CONTRACT_TEMPLATE = `
✅ Contract deleted successfully: {{deletedContract.contractId}}{{#if deletedContract.contractName}} ({{deletedContract.contractName}}){{/if}} ({{hashscanLink deletedContract.contractId "contract" network}})
`.trim();
