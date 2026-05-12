import type { z } from 'zod';

import { EvmBaseUnitSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "balanceOf(address)" contract call (uint256).
 */
export const ContractErc721CallBalanceOfResultSchema = EvmBaseUnitSchema;

export type ContractErc721CallBalanceOfResult = z.infer<
  typeof ContractErc721CallBalanceOfResultSchema
>;
