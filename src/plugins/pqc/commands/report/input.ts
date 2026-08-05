/**
 * PQC Report Command Input Schema
 */
import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

export const PqcReportInputSchema = z.object({
  format: z
    .enum(['json', 'csv', 'human'])
    .default('human')
    .describe('Output format for the report'),
  network: NetworkSchema.optional().describe('Filter by network'),
});

export type PqcReportInput = z.infer<typeof PqcReportInputSchema>;
