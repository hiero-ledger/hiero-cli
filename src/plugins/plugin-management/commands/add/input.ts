import { z } from 'zod';
import { FilePathSchema } from '../../../../core/schemas';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin from filesystem path
 */
export const AddPluginInputSchema = z.object({
  path: FilePathSchema.describe(
    'Filesystem path to the plugin directory containing manifest.js',
  ),
});

export type AddPluginInput = z.infer<typeof AddPluginInputSchema>;
