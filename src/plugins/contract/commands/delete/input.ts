import { z } from 'zod';

import { ContractReferenceSchema } from '@/core/schemas';

export const DeleteContractInputSchema = z.object({
  contract: ContractReferenceSchema.describe(
    'Contract ID (0.0.xxx) or alias name to delete from state',
  ),
});

export type DeleteContractInput = z.infer<typeof DeleteContractInputSchema>;
