import { z } from 'zod';

import { EntityIdSchema, PublicKeyDefinitionSchema } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ScheduleCreateOutputSchema = z.object({
  name: z.string(),
  waitForExpiry: z.boolean().default(false),
  payerAccountId: EntityIdSchema.optional(),
  adminPublicKey: PublicKeyDefinitionSchema.optional(),
  expirationTime: z.string().optional(),
  memo: z.string().optional(),
  network: z.enum(SupportedNetwork),
});

export type ScheduleCreateOutput = z.infer<typeof ScheduleCreateOutputSchema>;

export const SCHEDULE_CREATE_TEMPLATE = `
✅ Scheduled record created successfully
   Name: {{name}}
   Wait for expiry: {{waitForExpiry}}
   Network: {{network}}
{{#if payerAccountId}}
   Payer account ID: {{payerAccountId}}
{{/if}}
{{#if adminPublicKey}}
   Admin public key: {{adminPublicKey}}
{{/if}}
{{#if expirationTime}}
   Expiration Date: {{expirationTime}}
{{/if}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
`.trim();
