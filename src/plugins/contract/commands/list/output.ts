/**
 * List Tokens Command Output Schema and Template
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  ContractNameSchema,
  ContractVerifiedSchema,
  EntityIdSchema,
  EvmAddressSchema,
} from '@/core/schemas/common-schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

/**
 * Contract List Item Schema
 */
const ContractListItemSchema = z.object({
  contractId: EntityIdSchema.describe('Contract ID'),
  contractName: ContractNameSchema,

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  adminPublicKey: z.string().optional(),
  alias: AliasNameSchema.optional(),

  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),
  verified: ContractVerifiedSchema,
});

/**
 * Contract List Command Output Schema
 */
export const ContractListOutputSchema = z.object({
  contracts: z.array(ContractListItemSchema),
  totalCount: z
    .number()
    .int()
    .nonnegative()
    .describe('Total number of contracts'),
});

export type ContractListOutput = z.infer<typeof ContractListOutputSchema>;
export type ContractListItem = z.infer<typeof ContractListItemSchema>;

/**
 * Human-readable template for cotnract list output
 */
export const CONTRACT_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No contracts found
{{else}}
📝 Found {{totalCount}} contract(s):

{{#each contracts}}
{{add1 @index}}. Contract ID: {{hashscanLink contractId "contract" network}}
   Contract name: {{contractName}}
   Contract EVM address: {{contractEvmAddress}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
{{#if adminPublicKey}}
   Admin public key: {{adminPublicKey}}
{{/if}}
   Network: {{network}}
   Contract Verified: {{#if verified}}Yes{{else}}No{{/if}}

{{/each}}
{{/if}}
`.trim();
