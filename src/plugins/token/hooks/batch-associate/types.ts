import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

const ResolvedAccountCredentialSchema = z.object({
  keyRefId: z.string(),
  accountId: z.string(),
  publicKey: z.string(),
});

export const AssociateNormalizedParamsSchema = z.object({
  network: NetworkSchema,
  tokenId: z.string(),
  account: ResolvedAccountCredentialSchema,
  keyManager: keyManagerNameSchema,
  alreadyAssociated: z.boolean(),
});
