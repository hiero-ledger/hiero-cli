import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc721CallOwnerOfOutputSchema = z.object({
  contractId: EntityIdSchema,
  owner: EvmAddressSchema,
  ownerAlias: z.string().optional(),
  ownerEntityId: EntityIdSchema.optional(),
  network: NetworkSchema,
});

export type ContractErc721CallOwnerOfOutput = z.infer<
  typeof ContractErc721CallOwnerOfOutputSchema
>;

export const CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "ownerOf" called successfully!
   Owner: {{owner}}
{{#if ownerAlias}}
   Known as: {{ownerAlias}}
{{/if}}
{{#if ownerEntityId}}
   Account ID: {{hashscanLink ownerEntityId "account" network}}
{{/if}}
`.trim();
