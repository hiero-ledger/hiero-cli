import { z } from 'zod';

/**
 * Input schema for auctionlog verify command.
 * Verifies the integrity of audit commitments.
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
  onChain: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Enable on-chain verification: fetch HCS messages from the mirror node and compare against local state.',
    ),
});

export type VerifyInput = z.infer<typeof VerifyInputSchema>;
