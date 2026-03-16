/**
 * Import Account Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  KeyTypeSchema,
  NetworkSchema,
  TinybarSchema,
} from '@/core/schemas/common-schemas';

/**
 * Import Account Command Output Schema
 */
export const AccountImportOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name').optional(),
  type: KeyTypeSchema,
  network: NetworkSchema,
  balance: TinybarSchema,
  evmAddress: EvmAddressSchema,
});

export type AccountImportOutput = z.infer<typeof AccountImportOutputSchema>;

/**
 * Human-readable template for import account output
 */
export const ACCOUNT_IMPORT_TEMPLATE = `
✅ Account imported successfully: {{hashscanLink accountId "account" network}}
{{#if name}}
   Name: {{name}}
{{/if}}
   Type: {{type}}
   Network: {{network}}
   EVM Address: {{evmAddress}}
   Balance: {{balance}} tinybars
`.trim();
