import type { z } from 'zod';

import { ZOD_CUSTOM_ISSUE_CODE } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';

type MinimalSupplyArgs = {
  maxSupply?: string;
  supplyType?: SupplyType;
};

export function validateSupplyTypeAndMaxSupply<Args extends MinimalSupplyArgs>(
  args: Args,
  ctx: z.RefinementCtx,
) {
  const isFinite = args.supplyType === SupplyType.FINITE;

  if (isFinite && !args.maxSupply) {
    ctx.addIssue({
      message: 'Max supply is required when supply type is FINITE',
      code: ZOD_CUSTOM_ISSUE_CODE,
      path: ['maxSupply', 'supplyType'],
    });
  }

  if (!isFinite && args.maxSupply) {
    ctx.addIssue({
      message:
        'Max supply should not be provided when supply type is INFINITE, set supply type to FINITE to specify max supply',
      code: ZOD_CUSTOM_ISSUE_CODE,
      path: ['supplyType', 'maxSupply'],
    });
  }
}
