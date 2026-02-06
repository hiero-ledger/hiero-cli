import { z } from 'zod';

import {
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 call getApproved command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 * tokenId is uint256 (non-negative integer).
 */
export const ContractErc721CallGetApprovedInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema,
});
