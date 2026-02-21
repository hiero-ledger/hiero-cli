import { z } from 'zod';

/**
 * Input schema for auctionlog list command.
 * Lists all tracked auctions and their stages.
 */
export const ListInputSchema = z.object({
  // No required inputs — lists all known auctions
});

export type ListInput = z.infer<typeof ListInputSchema>;
