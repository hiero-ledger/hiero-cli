import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

export const ContractErc721CallApproveInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  to: AccountReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema.describe(
    'Token ID (uint256) to approve for transfer',
  ),
});
