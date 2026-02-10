import { z } from 'zod';

import {
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 call ownerOf command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 * tokenId is uint256 (non-negative integer).
 */
export const ContractErc721CallOwnerOfInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema.describe(
    'Token ID (uint256) for ownerOf query',
  ),
});
