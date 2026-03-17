import { z } from 'zod';

import { FilePathSchema, PluginNameSchema } from '@/core/schemas';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin - either by path (custom) or name (default)
 */
export const PluginManagementAddInputSchema = z
  .object({
    path: FilePathSchema.optional().describe(
      'Filesystem path to the plugin directory containing manifest.js',
    ),
    name: PluginNameSchema.optional().describe(
      'Name of a default plugin to add (e.g. account, token)',
    ),
  })
  .refine(
    (data) => !(data.path && data.name),
    'Provide either --path or --name, not both',
  )
  .refine(
    (data) => Boolean(data.path || data.name),
    'Provide either --path or --name',
  );

export type PluginManagementAddInput = z.infer<
  typeof PluginManagementAddInputSchema
>;
