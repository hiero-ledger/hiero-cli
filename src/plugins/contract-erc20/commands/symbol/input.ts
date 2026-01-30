import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call symbol command
 */
export const ContractErc20CallSymbolInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract identifier (ID or alias)'),
});
