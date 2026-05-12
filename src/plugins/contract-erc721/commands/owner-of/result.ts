import type { z } from 'zod';

import { EvmAddressSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "ownerOf(uint256 tokenId)" contract call (address).
 */
export const ContractErc721CallOwnerOfResultSchema = EvmAddressSchema;

export type ContractErc721CallOwnerOfResult = z.infer<
  typeof ContractErc721CallOwnerOfResultSchema
>;
