import type { z } from 'zod';

import { EvmDecimalsSchema } from '@/core/schemas';

/**
 * Schema for validating the raw result returned from the
 * ERC-20 "decimals" contract call.
 */
export const ContractErc20CallDecimalsResultSchema = EvmDecimalsSchema;

export type ContractErc20CallDecimalsResult = z.infer<
  typeof ContractErc20CallDecimalsResultSchema
>;
