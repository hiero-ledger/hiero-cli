import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call symbol command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallSymbolInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
});
