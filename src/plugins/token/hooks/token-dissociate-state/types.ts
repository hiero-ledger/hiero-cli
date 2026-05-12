import { z } from 'zod';

import {
  NetworkSchema,
  ResolvedAccountCredentialSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

export const DissociateNormalizedParamsSchema = z.object({
  network: NetworkSchema,
  tokenId: z.string(),
  account: ResolvedAccountCredentialSchema,
  keyManager: keyManagerNameSchema,
  alreadyDissociated: z.boolean(),
});
