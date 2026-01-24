/**
 * Batch Token Transfer Input Schema
 */
import { z } from 'zod';

import {
  EntityReferenceSchema,
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas/common-schemas';

export const BatchTokenTransferInputSchema = z.object({
  file: FilePathSchema.describe('Path to CSV file containing transfers'),
  token: EntityReferenceSchema.describe('Token ID or alias to transfer'),
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

export type BatchTokenTransferInput = z.infer<
  typeof BatchTokenTransferInputSchema
>;
