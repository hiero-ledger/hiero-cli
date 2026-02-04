import { z } from 'zod';

import {
  ContractErc721TokenIdSchema,
  EntityIdSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc721CallTokenUriOutputSchema = z.object({
  contractId: EntityIdSchema,
  tokenId: ContractErc721TokenIdSchema,
  tokenURI: z.string(),
  network: NetworkSchema,
});

export type ContractErc721CallTokenUriOutput = z.infer<
  typeof ContractErc721CallTokenUriOutputSchema
>;

export const CONTRACT_ERC721_CALL_TOKEN_URI_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "tokenURI" called successfully!
   Token ID: {{tokenId}}
   Token URI: {{tokenURI}}
`.trim();
