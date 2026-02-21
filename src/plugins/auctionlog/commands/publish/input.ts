import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

/**
 * Input schema for auctionlog publish command.
 * All fields are validated before business logic runs.
 */
export const PublishInputSchema = z.object({
  auctionId: z
    .string()
    .min(1, 'Auction ID is required')
    .describe('Unique auction identifier (e.g. AUCTION-001)'),
  stage: z
    .enum([
      'created',
      'bidding-open',
      'bidding-closed',
      'awarded',
      'settled',
      'disputed',
    ])
    .describe(
      'Auction stage: created | bidding-open | bidding-closed | awarded | settled | disputed',
    ),
  topic: EntityReferenceSchema.optional().describe(
    'Existing HCS topic ID (e.g. 0.0.123456). If omitted, a new topic is created.',
  ),
  metadata: z
    .string()
    .optional()
    .describe(
      'Private metadata to include in the commitment hash (e.g. external transaction references). Not published on-chain.',
    ),
});

export type PublishInput = z.infer<typeof PublishInputSchema>;
