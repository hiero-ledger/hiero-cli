import type { z } from 'zod';

import { NonNegativeNumberOrBigintSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "totalSupply" mirror contract call (uint256).
 */
export const ContractErc20CallTotalSupplyResultSchema =
  NonNegativeNumberOrBigintSchema;

export type ContractErc20CallTotalSupplyResult = z.infer<
  typeof ContractErc20CallTotalSupplyResultSchema
>;
