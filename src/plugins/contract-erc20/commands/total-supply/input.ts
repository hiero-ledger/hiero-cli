import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call totalSupply command
 */
export const ContractErc20CallTotalSupplyInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
});
