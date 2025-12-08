import { z } from 'zod';
import { FilePathSchema } from '../../../../core/schemas';

/**
 * Input schema for state-management backup command
 * Validates arguments for creating state backup
 */
export const BackupStateInputSchema = z.object({
  dest: FilePathSchema.optional().describe(
    'Destination file path for the backup. If not provided, generates default filename with timestamp.',
  ),
});

export type BackupStateInput = z.infer<typeof BackupStateInputSchema>;
