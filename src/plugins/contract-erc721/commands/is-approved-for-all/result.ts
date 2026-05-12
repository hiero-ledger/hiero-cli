import { z } from 'zod';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "isApprovedForAll(address owner, address operator)" contract call (boolean).
 */
export const ContractErc721CallIsApprovedForAllResultSchema = z.boolean();

export type ContractErc721CallIsApprovedForAllResult = z.infer<
  typeof ContractErc721CallIsApprovedForAllResultSchema
>;
