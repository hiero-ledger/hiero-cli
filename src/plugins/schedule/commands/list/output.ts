import { z } from 'zod';

import { SupportedNetwork } from '@/core/types/shared.types';

export const ScheduleListItemSchema = z.object({
  name: z.string(),
  network: z.enum(SupportedNetwork),
  scheduled: z.boolean(),
  executed: z.boolean(),
  waitForExpiry: z.boolean(),
  expirationTime: z.string().optional(),
  createdAt: z.string().optional(),
});

export const ScheduleListOutputSchema = z.object({
  network: z.enum(SupportedNetwork),
  schedules: z.array(ScheduleListItemSchema),
  total: z.number().int().nonnegative(),
});

export type ScheduleListItem = z.infer<typeof ScheduleListItemSchema>;
export type ScheduleListOutput = z.infer<typeof ScheduleListOutputSchema>;

export const SCHEDULE_LIST_TEMPLATE = `
📋 Scheduled transactions on {{network}}
{{#if total}}
{{#each schedules}}
   ─────────────────────────────────
   Name: {{name}}
   Scheduled: {{#if scheduled}}✅ Yes{{else}}❌ No{{/if}}
   Executed: {{#if executed}}✅ Yes{{else}}❌ No{{/if}}
   Wait for expiry: {{waitForExpiry}}
{{#if expirationTime}}
   Expiration: {{expirationTime}}
{{/if}}
{{#if createdAt}}
   Created at: {{createdAt}}
{{/if}}
{{/each}}
   Total: {{total}}
{{else}}
   No scheduled transactions found on this network.
{{/if}}
`.trim();
