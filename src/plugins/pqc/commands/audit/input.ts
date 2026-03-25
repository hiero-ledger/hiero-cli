/**
 * PQC Audit Command Input Schema
 */
import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

export const PqcAuditInputSchema = z.object({
  account: z
    .string()
    .optional()
    .describe(
      'Account ID or alias to audit. If omitted, audits all managed accounts.',
    ),
  network: NetworkSchema.optional().describe('Filter by network'),
});

export type PqcAuditInput = z.infer<typeof PqcAuditInputSchema>;
