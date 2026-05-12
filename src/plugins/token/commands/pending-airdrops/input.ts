import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

export const TokenPendingAirdropsInputSchema = z.object({
  account: EntityReferenceSchema.describe(
    'Account ID or alias to query (e.g. 0.0.1234 or my-account)',
  ),
  showAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Fetch all pages instead of the first 25'),
});

export type TokenPendingAirdropsInput = z.infer<
  typeof TokenPendingAirdropsInputSchema
>;
