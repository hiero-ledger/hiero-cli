import { z } from 'zod';

import { EntityIdSchema, IsoTimestampSchema, NetworkSchema } from '@/core/schemas';

/**
 * Publish command output schema.
 * Structured output for commitment publication.
 */
export const PublishOutputSchema = z.object({
  auctionId: z.string(),
  stage: z.string(),
  commitmentHash: z.string().describe('SHA-256 hash of the commitment fields'),
  topicId: EntityIdSchema.describe('HCS topic where commitment was published'),
  sequenceNumber: z.number().int().nonnegative(),
  metadata: z.string(),
  timestamp: IsoTimestampSchema,
  nonce: z.string(),
  network: NetworkSchema,
});

export type PublishOutput = z.infer<typeof PublishOutputSchema>;

export const PUBLISH_TEMPLATE = `
✅ Audit commitment published

   Auction ID: {{auctionId}}
   Stage: {{stage}}
   Commitment: {{commitmentHash}}
   Topic: {{hashscanLink topicId "topic" network}}
   Sequence: {{sequenceNumber}}
   Timestamp: {{timestamp}}
{{#if metadata}}   Metadata: (included in hash, not published on-chain){{/if}}
`.trim();
