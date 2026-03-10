import { z } from 'zod';

import {
  EntityReferenceSchema,
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

/**
 * Input schema for batch transfer-ft command.
 *
 * CSV format expected:
 *   to,amount
 *   0.0.12345,100
 *   alice,50.5
 */
export const BatchTransferFtInputSchema = z.object({
  file: FilePathSchema.describe('Path to CSV file with transfer data'),
  token: EntityReferenceSchema.describe(
    'Token to transfer: either a token alias or token-id',
  ),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account for all transfers. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  dryRun: z
    .union([z.boolean(), z.string().transform((v) => v === 'true')])
    .optional()
    .default(false)
    .describe('Validate CSV without executing transactions'),
});

export type BatchTransferFtInput = z.infer<typeof BatchTransferFtInputSchema>;
