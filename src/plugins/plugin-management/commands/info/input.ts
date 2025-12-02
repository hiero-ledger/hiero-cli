import { z } from 'zod';
import { PluginNameSchema } from '../../../../core/schemas';

/**
 * Input schema for plugin-management info command
 * Validates arguments for retrieving plugin information
 */
export const PluginInfoInputSchema = z.object({
  name: PluginNameSchema.describe('Name of the plugin for information display'),
});

export type PluginInfoInput = z.infer<typeof PluginInfoInputSchema>;
