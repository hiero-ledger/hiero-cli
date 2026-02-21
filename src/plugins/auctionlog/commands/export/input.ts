import { z } from 'zod';

/**
 * Input schema for auctionlog export command.
 * Exports the audit trail as JSON or CSV.
 */
export const ExportInputSchema = z.object({
  auctionId: z
    .string()
    .min(1, 'Auction ID is required')
    .describe('Auction ID to export audit trail for'),
  type: z
    .enum(['json', 'csv'])
    .optional()
    .default('json')
    .describe('Export format: json (default) or csv'),
  file: z
    .string()
    .optional()
    .describe(
      'Output file path. If omitted, prints to stdout.',
    ),
});

export type ExportInput = z.infer<typeof ExportInputSchema>;
