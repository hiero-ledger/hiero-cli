/**
 * List Accounts Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  KeyTypeSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';

/**
 * List Accounts Command Output Schema
 */
export const ListAccountsOutputSchema = z.object({
  accounts: z.array(
    z.object({
      name: z.string().describe('Account name or alias'),
      accountId: EntityIdSchema,
      type: KeyTypeSchema,
      network: NetworkSchema,
      evmAddress: EvmAddressSchema,
      keyRefId: z.string().describe('Key reference ID').optional(), // Only included when --private flag is used
    }),
  ),
  totalCount: z.number().describe('Total number of accounts'),
});

export type ListAccountsOutput = z.infer<typeof ListAccountsOutputSchema>;

/**
 * Human-readable template for list accounts output
 */
export const LIST_ACCOUNTS_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No accounts found in the address book
{{else}}
📝 Found {{totalCount}} account(s):

{{#each accounts}}
{{add1 @index}}. Name: {{name}}
   Account ID: {{hashscanLink accountId "account" network}}
   Type: {{type}}
   Network: {{network}}
   EVM Address: {{evmAddress}}
{{#if keyRefId}}
   Key Reference ID: {{keyRefId}}
{{/if}}

{{/each}}
{{/if}}
`.trim();
