import { z } from 'zod';

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
      code: z.ZodIssueCode.custom,
      path: ['maxSupply', 'supplyType'],
    });
  }

  if (!isFinite && args.maxSupply) {
    ctx.addIssue({
      message:
        'Max supply should not be provided when supply type is INFINITE, set supply type to FINITE to specify max supply',
      code: z.ZodIssueCode.custom,
      path: ['supplyType', 'maxSupply'],
    });
  }
}
