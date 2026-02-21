import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const StatusOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  /** "PENDING" | "EXECUTED" | "DELETED" */
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED']),
  executed: z.boolean(),
  deleted: z.boolean(),
  /** ISO-8601 timestamp when the schedule was created */
  createdAt: z.string().optional(),
  /** ISO-8601 expiry timestamp */
  expiresAt: z.string().optional(),
  memo: z.string().optional(),
  network: z.string(),
});

export type StatusOutput = z.infer<typeof StatusOutputSchema>;

export const STATUS_HUMAN_TEMPLATE = `
Schedule Status
  Schedule ID: {{scheduleId}}  ({{hashscanLink scheduleId}})
  State:       {{state}}
  Executed:    {{executed}}
  Deleted:     {{deleted}}
{{#if createdAt}}  Created:     {{createdAt}}
{{/if}}{{#if expiresAt}}  Expires:     {{expiresAt}}
{{/if}}{{#if memo}}  Memo:        {{memo}}
{{/if}}  Network:     {{network}}
`.trim();
