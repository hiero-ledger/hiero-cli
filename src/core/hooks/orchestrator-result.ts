import { z } from 'zod';

import { BatchDataSchema } from '@/plugins/batch/schema';
import { ScheduledTransactionDataSchema } from '@/plugins/schedule/schema';

export const BatchOrchestratorResult = z.object({
  source: z.literal('batch'),
  batchData: BatchDataSchema,
});

export const ScheduleOrchestratorResult = z.object({
  source: z.literal('schedule'),
  scheduledData: ScheduledTransactionDataSchema,
});

export const OrchestratorResultSchema = z.discriminatedUnion('source', [
  BatchOrchestratorResult,
  ScheduleOrchestratorResult,
]);

export type OrchestratorResult = z.infer<typeof OrchestratorResultSchema>;
