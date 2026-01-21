import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for view command
 * Validates arguments for viewing token information
 */
export const ViewTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  serial: z.string().optional().describe('NFT serial number (optional)'),
});

export type ViewTokenInput = z.infer<typeof ViewTokenInputSchema>;
