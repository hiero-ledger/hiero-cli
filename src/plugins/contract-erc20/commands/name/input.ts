import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call name command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallNameInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
});
