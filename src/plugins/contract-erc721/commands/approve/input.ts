import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

export const ContractErc721CallApproveInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  to: AccountReferenceObjectSchema,
  tokenId: z
    .number()
    .nonnegative('Token ID must be greater than or equal to 0')
    .describe('Token ID (uint256) to approve for transfer'),
});
