import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { TokenAliasNameSchema } from '@/core/schemas/common-schemas';

export const ImportTokenInputSchema = z.object({
  token: EntityIdSchema.describe('Token ID to import (format: 0.0.xxx)'),
  name: TokenAliasNameSchema.optional().describe(
    'Optional name/alias for the token',
  ),
});

export type ImportTokenInput = z.infer<typeof ImportTokenInputSchema>;
