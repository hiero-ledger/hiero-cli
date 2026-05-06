/**
 * PQC Score Command Input Schema
 */
import { z } from 'zod';

import { EntityReferenceSchema, NetworkSchema } from '@/core/schemas';

export const PqcScoreInputSchema = z.object({
  account: EntityReferenceSchema.describe('Account ID or alias to score'),
  network: NetworkSchema.optional().describe('Network of the account'),
});

export type PqcScoreInput = z.infer<typeof PqcScoreInputSchema>;
