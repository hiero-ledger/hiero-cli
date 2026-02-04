import type { z } from 'zod';

import { EvmBaseUnitSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "totalSupply" contract call (uint256).
 */
export const ContractErc20CallTotalSupplyResultSchema = EvmBaseUnitSchema;

export type ContractErc20CallTotalSupplyResult = z.infer<
  typeof ContractErc20CallTotalSupplyResultSchema
>;
