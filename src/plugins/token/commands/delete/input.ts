import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenDeleteInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  adminKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Credential(s) that can sign as the token admin. Pass multiple times when the admin policy requires more than one signature (M-of-N). Same formats as other CLI key options.',
  ),
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
