import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

export const ContractErc721CallSetApprovalForAllInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  operator: AccountReferenceObjectSchema,
  approved: z
    .union([
      z.string().transform((val) => {
        const lower = val.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
        throw new Error('approved must be "true" or "false"');
      }),
      z.boolean(),
    ])
    .describe(
      'Whether to approve or revoke the operator. Value must be "true" or "false"',
    ),
});
