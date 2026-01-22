import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const CreateContractOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractEvmAddress: EvmAddressSchema,
  alias: AliasNameSchema.optional(),
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type CreateContractOutput = z.infer<typeof CreateContractOutputSchema>;

export const CREATE_CONTRACT_TEMPLATE = `
✅ Contract created successfully: {{contractId}}
   Contract EVM address: {{contractEvmAddress}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{transactionId}}
`.trim();
