import { z } from 'zod';

import { ConfigOptionNameSchema } from '@/core/schemas';

/**
 * Input schema for config get command
 * Validates arguments for retrieving a configuration option value
 */
export const GetConfigInputSchema = z.object({
  option: ConfigOptionNameSchema.describe('Configuration option name to read'),
});

export type GetConfigInput = z.infer<typeof GetConfigInputSchema>;
