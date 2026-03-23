import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { SupportedNetwork } from '@/core/types/shared.types';
import { AccountDataSchema } from '@/plugins/account/schema';

export const AccountDeleteNormalisedParamsSchema = z.object({
  network: z.enum(SupportedNetwork),
  stateKey: z.string().min(1),
  accountToDelete: AccountDataSchema,
  transferAccountId: EntityIdSchema,
  accountRef: z.string(),
});
