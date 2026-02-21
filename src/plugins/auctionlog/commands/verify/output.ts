import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

const VerifyEntrySchema = z.object({
  stage: z.string(),
  commitmentHash: z.string(),
  verified: z.boolean(),
  timestamp: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  reason: z.string().optional(),
});

/**
 * Verify command output schema.
 * Shows verification result for each stage in the auction timeline.
 */
export const VerifyOutputSchema = z.object({
  auctionId: z.string(),
  topicId: z.string(),
  network: NetworkSchema,
  totalStages: z.number().int().nonnegative(),
  verifiedCount: z.number().int().nonnegative(),
  allValid: z.boolean(),
  entries: z.array(VerifyEntrySchema),
});

export type VerifyOutput = z.infer<typeof VerifyOutputSchema>;

export const VERIFY_TEMPLATE = `
{{#if allValid}}✅ All commitments verified for auction {{auctionId}}{{else}}⚠️  Some commitments FAILED verification for auction {{auctionId}}{{/if}}

   Topic: {{hashscanLink topicId "topic" network}}
   Stages verified: {{verifiedCount}} / {{totalStages}}

{{#each entries}}
   {{#if verified}}✅{{else}}❌{{/if}} {{stage}} — seq #{{sequenceNumber}} — {{timestamp}}
      Hash: {{commitmentHash}}
      {{#unless verified}}Reason: {{reason}}{{/unless}}
{{/each}}
`.trim();
