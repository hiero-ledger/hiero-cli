import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call name command]
 */
export const ContractErc20CallNameInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract identifier (ID or alias)'),
});
