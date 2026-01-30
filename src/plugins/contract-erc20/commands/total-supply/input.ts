import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call totalSupply command
 */
export const ContractErc20CallTotalSupplyInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract identifier (ID or alias)'),
});
