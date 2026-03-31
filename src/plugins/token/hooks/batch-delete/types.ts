import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

export const DeleteNormalizedParamsSchema = z.object({
  network: NetworkSchema,
  tokenId: z.string(),
  tokenName: z.string(),
});
