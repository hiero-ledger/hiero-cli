/**
 * PQC Score Command Input Schema
 */
import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

export const PqcScoreInputSchema = z.object({
  account: z
    .string()
    .describe('Account ID or alias to score'),
  network: NetworkSchema.optional().describe('Network of the account'),
});

export type PqcScoreInput = z.infer<typeof PqcScoreInputSchema>;
