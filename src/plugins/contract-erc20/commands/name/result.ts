import type { z } from 'zod';

import { ContractNameSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "name" mirror contract call.
 */
export const ContractErc20CallNameResultSchema = ContractNameSchema;

export type ContractErc20CallNameResult = z.infer<
  typeof ContractErc20CallNameResultSchema
>;
