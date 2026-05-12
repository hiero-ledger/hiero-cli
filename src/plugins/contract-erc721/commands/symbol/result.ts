import { z } from 'zod';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "symbol()" contract call (string).
 */
export const ContractErc721CallSymbolResultSchema = z.string();

export type ContractErc721CallSymbolResult = z.infer<
  typeof ContractErc721CallSymbolResultSchema
>;
