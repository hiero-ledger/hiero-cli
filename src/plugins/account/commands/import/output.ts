/**
 * Import Account Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  KeyTypeSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';

/**
 * Import Account Command Output Schema
 */
export const ImportAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name or alias'),
  type: KeyTypeSchema,
  alias: z.string().describe('Account alias').optional(),
  network: NetworkSchema,
  balance: z.string(),
  evmAddress: EvmAddressSchema,
});

export type ImportAccountOutput = z.infer<typeof ImportAccountOutputSchema>;

/**
 * Human-readable template for import account output
 */
export const IMPORT_ACCOUNT_TEMPLATE = `
✅ Account imported successfully: {{hashscanLink accountId "account" network}}
   Name: {{name}}
   Type: {{type}}
   Network: {{network}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   EVM Address: {{evmAddress}}
   Balance: {{balance}} tinybars
`.trim();
