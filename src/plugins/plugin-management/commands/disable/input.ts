import { z } from 'zod';

import { PluginNameSchema } from '@/core/schemas';

/**
 * Input schema for plugin-management disable command
 * Validates arguments for disabling a plugin
 */
export const PluginManagementDisableInputSchema = z.object({
  name: PluginNameSchema.describe('Name of the plugin to disable'),
});

export type DisablePluginInput = z.infer<
  typeof PluginManagementDisableInputSchema
>;
