import { z } from 'zod';

type MinimalSupplyArgs = {
  maxSupply?: string;
  // @TODO Add enum for supply type
  supplyType?: 'FINITE' | 'INFINITE';
};

export function validateSupplyTypeAndMaxSupply<Args extends MinimalSupplyArgs>(
  args: Args,
  ctx: z.RefinementCtx,
) {
  const isFinite = args.supplyType === 'FINITE';

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
