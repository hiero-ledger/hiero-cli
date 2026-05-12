import type { z } from 'zod';

import { ContractNameSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-721 "name()" contract call (string).
 */
export const ContractErc721CallNameResultSchema = ContractNameSchema;

export type ContractErc721CallNameResult = z.infer<
  typeof ContractErc721CallNameResultSchema
>;
