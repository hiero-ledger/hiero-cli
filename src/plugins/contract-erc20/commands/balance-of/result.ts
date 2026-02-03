import type { z } from 'zod';

import { EvmBaseUnitSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "balanceOf(address)" contract call (uint256).
 */
export const ContractErc20CallBalanceOfResultSchema = EvmBaseUnitSchema;

export type ContractErc20CallBalanceOfResult = z.infer<
  typeof ContractErc20CallBalanceOfResultSchema
>;
