import { z } from 'zod';

import { PluginNameSchema } from '@/core/schemas';

/**
 * Input schema for plugin-management enable command
 * Validates arguments for enabling a plugin
 */
export const PluginManagementEnableInputSchema = z.object({
  name: PluginNameSchema.describe('Name of the plugin to enable'),
});

export type PluginManagementEnableInput = z.infer<
  typeof PluginManagementEnableInputSchema
>;
