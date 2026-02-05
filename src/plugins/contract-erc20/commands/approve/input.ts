import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc20 call approve command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc20CallApproveInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.optional()
    .default(100000)
    .describe('Gas for contract call. Default: 100000'),
  spender: AccountReferenceObjectSchema,
  value: z
    .number()
    .min(0, 'Approve value must be greater than or equal to 0')
    .describe('Approval amount for contract approve call'),
});
