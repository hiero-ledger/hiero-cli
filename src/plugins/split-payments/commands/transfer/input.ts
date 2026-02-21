import { z } from 'zod';

import { KeyManagerTypeSchema, KeyOrAccountAliasSchema } from '@/core/schemas';

/**
 * Input schema for split-payments transfer command.
 * Validates: file path (CSV), optional payer (from), key-manager, dry-run.
 */
export const SplitPaymentsTransferInputSchema = z.object({
  file: z
    .string()
    .min(1, 'CSV file path is required')
    .describe(
      'Path to CSV file with columns: to (address or alias), amount (HBAR or amount with t for tinybars)',
    ),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Payer account: alias or accountId:privateKey. Defaults to operator.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager: local or local_encrypted (defaults to config)',
  ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, only validate and list planned transfers; do not send'),
});

export type SplitPaymentsTransferInput = z.infer<
  typeof SplitPaymentsTransferInputSchema
>;
