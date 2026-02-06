import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas';

export const ContractErc721CallIsApprovedForAllOutputSchema = z.object({
  contractId: EntityIdSchema,
  owner: z.string(),
  operator: z.string(),
  isApprovedForAll: z.boolean(),
  network: NetworkSchema,
});

export type ContractErc721CallIsApprovedForAllOutput = z.infer<
  typeof ContractErc721CallIsApprovedForAllOutputSchema
>;

export const CONTRACT_ERC721_CALL_IS_APPROVED_FOR_ALL_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "isApprovedForAll" called successfully!
   Owner: {{owner}}
   Operator: {{operator}}
   Is approved for all: {{#if isApprovedForAll}}Yes{{else}}No{{/if}}
`.trim();
