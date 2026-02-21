import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

const ExportEntrySchema = z.object({
  stage: z.string(),
  commitmentHash: z.string(),
  timestamp: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  cantonRef: z.string(),
  adiTx: z.string(),
  nonce: z.string(),
});

/**
 * Export command output schema.
 */
export const ExportOutputSchema = z.object({
  auctionId: z.string(),
  topicId: z.string(),
  network: NetworkSchema,
  exportFormat: z.enum(['json', 'csv']),
  entryCount: z.number().int().nonnegative(),
  entries: z.array(ExportEntrySchema),
  filePath: z.string().optional(),
});

export type ExportOutput = z.infer<typeof ExportOutputSchema>;

export const EXPORT_TEMPLATE = `
📦 Exported {{entryCount}} audit entries for auction {{auctionId}}

   Topic: {{hashscanLink topicId "topic" network}}
   Format: {{exportFormat}}
{{#if filePath}}   File: {{filePath}}{{/if}}

Timeline:
{{#each entries}}
   {{sequenceNumber}}. [{{stage}}] {{timestamp}} — {{commitmentHash}}
{{/each}}
`.trim();
