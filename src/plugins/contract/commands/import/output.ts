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
  contractEvmAddress: EvmAddressSchema,
  name: AliasNameSchema.optional(),
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
{{#if name}}
   Name: {{name}}
{{/if}}
   Contract EVM address: {{contractEvmAddress}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Contract Verified: {{#if verified}}Yes{{else}}No{{/if}}
   Network: {{network}}
`.trim();
