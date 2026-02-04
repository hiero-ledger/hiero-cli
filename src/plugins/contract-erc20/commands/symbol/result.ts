import type { z } from 'zod';

import { ContractSymbolSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "symbol" mirror contract call.
 */
export const ContractErc20CallSymbolResultSchema = ContractSymbolSchema;

export type ContractErc20CallSymbolResult = z.infer<
  typeof ContractErc20CallSymbolResultSchema
>;
