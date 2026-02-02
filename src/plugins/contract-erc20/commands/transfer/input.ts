import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc20 call transfer command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallTransferInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  to: AccountReferenceObjectSchema,
  amount: z
    .number()
    .min(0, 'Transfer amount must be greater than or equal to 0')
    .describe('Transfer amount for contract transfer call'),
});
