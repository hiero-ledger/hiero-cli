import { z } from 'zod';

import { BatchDataSchema, ScheduledTransactionDataSchema } from '@/core';
import { OrchestratorSource } from '@/core/types/shared.types';

export const BatchOrchestratorResult = z.object({
  source: z.literal(OrchestratorSource.BATCH),
  batchData: BatchDataSchema,
});

export const ScheduleOrchestratorResult = z.object({
  source: z.literal(OrchestratorSource.SCHEDULE),
  scheduledData: ScheduledTransactionDataSchema,
});

export const OrchestratorResultSchema = z.discriminatedUnion('source', [
  BatchOrchestratorResult,
  ScheduleOrchestratorResult,
]);

export type OrchestratorResult = z.infer<typeof OrchestratorResultSchema>;
