import { z } from 'zod';

import {
  AliasNameSchema,
  ContractNameSchema,
  ContractVerifiedSchema,
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractCreateOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  contractEvmAddress: EvmAddressSchema,
  alias: AliasNameSchema.optional(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  adminPublicKey: PublicKeyDefinitionSchema.optional(),
  verified: ContractVerifiedSchema,
});

export type ContractCreateOutput = z.infer<typeof ContractCreateOutputSchema>;

export const CONTRACT_CREATE_TEMPLATE = `
✅ Contract created successfully: {{hashscanLink contractId "contract" network}}
   Contract name: {{contractName}}
   Contract EVM address: {{contractEvmAddress}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
{{#if adminPublicKey}}
   Admin public key: {{adminPublicKey}}
{{/if}}
   Contract Verified: {{#if verified}}Yes{{else}}No{{/if}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
