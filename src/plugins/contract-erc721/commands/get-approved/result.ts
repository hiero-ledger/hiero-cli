import { z } from 'zod';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "getApproved(uint256 tokenId)" contract call (address as string).
 */
export const ContractErc721CallGetApprovedResultSchema = z.string();

export type ContractErc721CallGetApprovedResult = z.infer<
  typeof ContractErc721CallGetApprovedResultSchema
>;
