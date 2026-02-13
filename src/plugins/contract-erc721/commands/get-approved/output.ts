import { z } from 'zod';

import {
  ContractErc721TokenIdSchema,
  EntityIdSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc721CallGetApprovedOutputSchema = z.object({
  contractId: EntityIdSchema,
  tokenId: ContractErc721TokenIdSchema,
  approved: z.string(),
  approvedAlias: z.string().optional(),
  network: NetworkSchema,
});

export type ContractErc721CallGetApprovedOutput = z.infer<
  typeof ContractErc721CallGetApprovedOutputSchema
>;

export const CONTRACT_ERC721_CALL_GET_APPROVED_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "getApproved" called successfully!
   Token ID: {{tokenId}}
   Approved address: {{approved}}
{{#if approvedAlias}}
   Known as: {{approvedAlias}}
{{/if}}
`.trim();
