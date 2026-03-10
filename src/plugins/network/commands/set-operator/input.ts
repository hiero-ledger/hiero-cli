import { z } from 'zod';

import { KeyManagerTypeSchema, KeySchema, NetworkSchema } from '@/core/schemas';

/**
 * Input schema for network set-operator command
 * Validates arguments for setting operator credentials
 */
export const NetworkSetOperatorInputSchema = z.object({
  operator: KeySchema.describe(
    'Operator credentials. Can be accountId:privateKey pair, key reference or account alias.',
  ),
  network: NetworkSchema.optional().describe(
    'Target network (defaults to current network)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
