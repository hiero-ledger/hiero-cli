import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc721 call symbol command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc721CallSymbolInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
});
