import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';
import { SwapTransferType } from '@/core/services/transfer/types';
import { SwapTransferSchema } from '@/plugins/swap/schema';

const HEDERA_MAX_HBAR_ENTRIES = 10;
const HEDERA_MAX_FT_ENTRIES_TOTAL = 10;

export const SwapExecuteTransfersSchema = z
  .array(SwapTransferSchema)
  .min(2, 'A swap requires at least 2 transfers. Add more with: hiero swap add')
  .superRefine((transfers, ctx) => {
    const hbarEntries =
      transfers.filter((t) => t.type === SwapTransferType.HBAR).length * 2;
    if (hbarEntries > HEDERA_MAX_HBAR_ENTRIES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Too many HBAR transfers (${hbarEntries / 2}); max ${HEDERA_MAX_HBAR_ENTRIES / 2} per execute.`,
      });
    }

    const ftEntries =
      transfers.filter((t) => t.type === SwapTransferType.FT).length * 2;
    if (ftEntries > HEDERA_MAX_FT_ENTRIES_TOTAL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Too many FT transfers (${ftEntries / 2}) across all token types; max ${HEDERA_MAX_FT_ENTRIES_TOTAL / 2} per execute.`,
      });
    }
  });

export const SwapExecuteInputSchema = z.object({
  name: AliasNameSchema.describe('Name of the swap to execute'),
});

export type SwapExecuteInput = z.infer<typeof SwapExecuteInputSchema>;
