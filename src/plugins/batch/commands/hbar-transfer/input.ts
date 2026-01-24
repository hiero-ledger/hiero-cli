/**
 * Batch HBAR Transfer Input Schema
 */
import { z } from 'zod';

import {
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas/common-schemas';

export const BatchHbarTransferInputSchema = z.object({
  file: FilePathSchema.describe('Path to CSV file containing transfers'),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account: either a stored alias or account-id:private-key pair (defaults to operator)',
  ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe('Validate CSV without executing transfers'),
  continueOnError: z
    .boolean()
    .optional()
    .default(false)
    .describe('Continue processing if a transfer fails'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use for signing',
  ),
});

export type BatchHbarTransferInput = z.infer<
  typeof BatchHbarTransferInputSchema
>;
