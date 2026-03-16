import { z } from 'zod';

import {
  ConfigOptionNameSchema,
  ConfigOptionValueSchema,
} from '@/core/schemas';

/**
 * Input schema for config set command
 * Validates arguments for setting a configuration option value
 */
export const ConfigSetInputSchema = z.object({
  option: ConfigOptionNameSchema.describe(
    'Configuration option name to set. Use `list` command to check available options.',
  ),
  value: ConfigOptionValueSchema.describe(
    'Value to set (boolean: true/false, number, or string)',
  ),
});

export type ConfigSetInput = z.infer<typeof ConfigSetInputSchema>;
