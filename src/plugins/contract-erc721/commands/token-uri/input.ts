import { z } from 'zod';

import {
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 call tokenURI command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 * tokenId is uint256 (non-negative integer).
 */
export const ContractErc721CallTokenUriInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema,
});
