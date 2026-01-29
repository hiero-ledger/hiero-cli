import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call decimals command
 */
export const ContractErc20CallDecimalsInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract identifier (ID or alias)'),
});
