import { z } from 'zod';

import { ContractReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call decimals command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallDecimalsInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
});
