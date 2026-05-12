import { z } from 'zod';

import {
  AliasNameSchema,
  ContractNameSchema,
  ContractVerifiedSchema,
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractCreateOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  contractEvmAddress: EvmAddressSchema,
  name: AliasNameSchema.optional(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  adminKeyPresent: z.boolean().describe('Whether admin key is set'),
  adminKeyThreshold: z
    .number()
    .int()
    .min(0)
    .describe('Admin key threshold (M-of-N)'),
  adminKeyCount: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Total number of admin keys'),
  verified: ContractVerifiedSchema,
});

export type ContractCreateOutput = z.infer<typeof ContractCreateOutputSchema>;

export const CONTRACT_CREATE_TEMPLATE = `
✅ Contract created successfully: {{hashscanLink contractId "contract" network}}
   Contract name: {{contractName}}
   Contract EVM address: {{contractEvmAddress}}
{{#if name}}
   Name: {{name}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{#if adminKeyCount}}{{#if adminKeyThreshold}} ({{adminKeyThreshold}}-of-{{adminKeyCount}}){{else}} ({{adminKeyCount}}-of-{{adminKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set{{/if}}
   Contract Verified: {{#if verified}}Yes{{else}}No{{/if}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
