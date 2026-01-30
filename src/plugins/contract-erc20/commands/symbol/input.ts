import { z } from 'zod';

import { EntityOrEvmAddressReferenceObjectSchema } from '@/core/schemas';

/**
 * Input schema for contract erc20 call symbol command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallSymbolInputSchema = z.object({
  contract: EntityOrEvmAddressReferenceObjectSchema,
});
