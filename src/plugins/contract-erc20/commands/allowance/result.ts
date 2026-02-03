import type { z } from 'zod';

import { EvmBaseUnitSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "allowance" contract call (uint256).
 */
export const ContractErc20CallAllowanceResultSchema = EvmBaseUnitSchema;

export type ContractErc20CallAllowanceResult = z.infer<
  typeof ContractErc20CallAllowanceResultSchema
>;
