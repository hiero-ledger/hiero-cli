import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

const VerifyEntrySchema = z.object({
  stage: z.string(),
  commitmentHash: z.string(),
  localVerified: z.boolean(),
  onChainVerified: z.boolean().nullable(),
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
  localVerifiedCount: z.number().int().nonnegative(),
  onChainVerifiedCount: z.number().int().nonnegative().nullable(),
  allLocalValid: z.boolean(),
  allOnChainValid: z.boolean().nullable(),
  onChainEnabled: z.boolean(),
  entries: z.array(VerifyEntrySchema),
});

export type VerifyOutput = z.infer<typeof VerifyOutputSchema>;

export const VERIFY_TEMPLATE = `
{{#if allLocalValid}}✅ All local commitments verified for auction {{auctionId}}{{else}}⚠️  Some commitments FAILED local verification for auction {{auctionId}}{{/if}}
{{#if onChainEnabled}}{{#if allOnChainValid}}✅ All on-chain commitments match{{else}}⚠️  Some on-chain commitments do NOT match{{/if}}{{/if}}

   Topic: {{hashscanLink topicId "topic" network}}
   Local verified: {{localVerifiedCount}} / {{totalStages}}
{{#if onChainEnabled}}   On-chain verified: {{onChainVerifiedCount}} / {{totalStages}}{{/if}}

{{#each entries}}
   {{#if localVerified}}✅{{else}}❌{{/if}}{{#if ../onChainEnabled}} {{#if onChainVerified}}🔗{{else}}{{#unless onChainVerified}}⛓️‍💥{{/unless}}{{/if}}{{/if}} {{stage}} — seq #{{sequenceNumber}} — {{timestamp}}
      Hash: {{commitmentHash}}
{{#if reason}}      Reason: {{reason}}{{/if}}
{{/each}}
`.trim();
