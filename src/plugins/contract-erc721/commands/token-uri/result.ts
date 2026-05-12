import { z } from 'zod';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "tokenURI(uint256 tokenId)" contract call (string).
 */
export const ContractErc721CallTokenUriResultSchema = z.string();

export type ContractErc721CallTokenUriResult = z.infer<
  typeof ContractErc721CallTokenUriResultSchema
>;
