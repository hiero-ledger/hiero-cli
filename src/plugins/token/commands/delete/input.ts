import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenDeleteInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  adminKey: KeySchema.optional().describe('Admin key for token deletion'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  stateOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Remove token only from local CLI state without network transaction',
    ),
});

export type TokenDeleteInput = z.infer<typeof TokenDeleteInputSchema>;
