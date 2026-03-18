/**
 * Import Contract Command Output Schema and Template
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
} from '@/core/schemas';

/**
 * Import Contract Command Output Schema
 */
export const ContractImportOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: z.string().optional().describe('Contract name in state'),
  contractEvmAddress: EvmAddressSchema,
  alias: AliasNameSchema.optional(),
  network: NetworkSchema,
  memo: z.string().optional(),
  verified: z.boolean(),
});

export type ContractImportOutput = z.infer<typeof ContractImportOutputSchema>;

/**
 * Human-readable template for import contract output
 */
export const IMPORT_CONTRACT_TEMPLATE = `
✅ Contract imported successfully: {{hashscanLink contractId "contract" network}}
{{#if contractName}}
   Contract name: {{contractName}}
{{/if}}
   Contract EVM address: {{contractEvmAddress}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Contract Verified: {{#if verified}}Yes{{else}}No{{/if}}
   Network: {{network}}
`.trim();
