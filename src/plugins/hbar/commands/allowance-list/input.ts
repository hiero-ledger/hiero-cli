import { z } from 'zod';

import { AccountReferenceObjectSchema } from '@/core/schemas/common-schemas';

export const HbarAllowanceListInputSchema = z.object({
  account: AccountReferenceObjectSchema.describe(
    'Owner account ID or alias to query',
  ),
  spender: AccountReferenceObjectSchema.optional().describe(
    'Optional spender account ID or alias filter',
  ),
  showAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Fetch all pages instead of the first page'),
});

export type HbarAllowanceListInput = z.infer<
  typeof HbarAllowanceListInputSchema
>;
