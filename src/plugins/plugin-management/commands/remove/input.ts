import { z } from 'zod';
import { PluginNameSchema } from '../../../../core/schemas';

/**
 * Input schema for plugin-management remove command
 * Validates arguments for removing a plugin from state
 */
export const RemovePluginInputSchema = z.object({
  name: PluginNameSchema.describe('Name of the plugin to remove from state'),
});

export type RemovePluginInput = z.infer<typeof RemovePluginInputSchema>;
