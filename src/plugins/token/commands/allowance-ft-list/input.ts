import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
} from '@/core/schemas/common-schemas';

export const TokenAllowanceFtListInputSchema = z.object({
  account: AccountReferenceObjectSchema.describe(
    'Owner account ID or alias to query',
  ),
  token: EntityReferenceSchema.optional().describe(
    'Optional token ID or alias filter',
  ),
  spender: AccountReferenceObjectSchema.optional().describe(
    'Optional spender account ID or alias filter',
  ),
  showAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Fetch all pages instead of the first page'),
  raw: z
    .boolean()
    .optional()
    .default(false)
    .describe('Skip token metadata enrichment'),
});

export type TokenAllowanceFtListInput = z.infer<
  typeof TokenAllowanceFtListInputSchema
>;
