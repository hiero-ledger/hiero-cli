import { z } from 'zod';

/**
 * Input schema for auctionlog verify command.
 * Verifies the integrity of an audit commitment.
 */
export const VerifyInputSchema = z.object({
  auctionId: z
    .string()
    .min(1, 'Auction ID is required')
    .describe('Auction ID to verify'),
  stage: z
    .enum([
      'created',
      'bidding-open',
      'bidding-closed',
      'awarded',
      'settled',
      'disputed',
    ])
    .optional()
    .describe(
      'Specific stage to verify. If omitted, verifies the entire timeline.',
    ),
});

export type VerifyInput = z.infer<typeof VerifyInputSchema>;
