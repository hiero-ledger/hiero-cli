import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
  NetworkSchema,
} from '@/core/schemas';

/**
 * Input schema for network set-operator command
 * Validates arguments for setting operator credentials
 */
export const SetOperatorInputSchema = z.object({
  operator: KeyOrAccountAliasSchema.describe(
    'Operator credentials: account name or AccountID:privateKey pair',
  ),
  network: NetworkSchema.optional().describe(
    'Target network (defaults to current network)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});
