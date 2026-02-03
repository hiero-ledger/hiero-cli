import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallTokenUriOutputSchema = z.object({
  contractId: EntityIdSchema,
  tokenId: z.number().int().nonnegative(),
  tokenURI: z.string(),
  network: SupportedNetwork,
});

export type ContractErc721CallTokenUriOutput = z.infer<
  typeof ContractErc721CallTokenUriOutputSchema
>;

export const CONTRACT_ERC721_CALL_TOKEN_URI_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "tokenURI" called successfully!
   Token ID: {{tokenId}}
   Token URI: {{tokenURI}}
`.trim();
