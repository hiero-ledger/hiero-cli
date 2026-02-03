import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc721 call ownerOf command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 * tokenId is uint256 (non-negative integer).
 */
export const ContractErc721CallOwnerOfInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  tokenId: z
    .number()
    .nonnegative('Token ID must be greater than or equal to 0')
    .describe('Token ID (uint256) for ownerOf query'),
});
