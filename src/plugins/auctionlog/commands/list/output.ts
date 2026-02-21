import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

const AuctionSummarySchema = z.object({
  auctionId: z.string(),
  topicId: z.string(),
  lastStage: z.string(),
  lastUpdated: z.string(),
  stageCount: z.number().int().nonnegative(),
});

/**
 * List command output schema.
 */
export const ListOutputSchema = z.object({
  network: NetworkSchema,
  auctions: z.array(AuctionSummarySchema),
  totalAuctions: z.number().int().nonnegative(),
});

export type ListOutput = z.infer<typeof ListOutputSchema>;

export const LIST_TEMPLATE = `
📋 Tracked Auctions ({{totalAuctions}})

{{#each auctions}}
   {{auctionId}}
      Topic: {{topicId}}
      Last Stage: {{lastStage}}
      Updated: {{lastUpdated}}
      Stages Published: {{stageCount}}
{{/each}}
{{#unless auctions.length}}
   No auctions tracked yet. Use: auctionlog publish --auction-id <id> --stage created
{{/unless}}
`.trim();
