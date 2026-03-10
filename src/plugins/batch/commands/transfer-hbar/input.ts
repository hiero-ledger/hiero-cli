import { z } from 'zod';

import {
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

/**
 * Input schema for batch transfer-hbar command.
 *
 * CSV format expected:
 *   to,amount
 *   0.0.12345,10
 *   alice,5.5
 */
export const BatchTransferHbarInputSchema = z.object({
  file: FilePathSchema.describe('Path to CSV file with transfer data'),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account for all transfers. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  memo: z
    .string()
    .optional()
    .describe('Optional memo applied to all transfers'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  dryRun: z
    .union([z.boolean(), z.string().transform((v) => v === 'true')])
    .optional()
    .default(false)
    .describe('Validate CSV without executing transactions'),
});

export type BatchTransferHbarInput = z.infer<
  typeof BatchTransferHbarInputSchema
>;
