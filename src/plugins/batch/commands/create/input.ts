import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

/**
 * Input schema for batch create command
 */
export const BatchCreateInputSchema = z.object({
  name: AliasNameSchema.describe('Batch name'),
  key: KeySchema.describe(
    'Key to sign batch transactions. Accepts any key format.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type BatchCreateInput = z.infer<typeof BatchCreateInputSchema>;
