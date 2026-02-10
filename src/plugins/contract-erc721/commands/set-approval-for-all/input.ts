import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ApprovedFlagSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

export const ContractErc721CallSetApprovalForAllInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  operator: AccountReferenceObjectSchema,
  approved: ApprovedFlagSchema,
});
