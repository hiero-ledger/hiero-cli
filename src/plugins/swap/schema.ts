import type { z } from 'zod';

import { z as zod } from 'zod';

import { AliasNameSchema, EntityIdSchema } from '@/core/schemas';
import { NetworkSchema } from '@/core/schemas/common-schemas';
import { SwapTransferType } from '@/core/services/transfer/types';

export const SwapTransferSchema = zod.object({
  fromAccount: EntityIdSchema,
  fromKeyRefId: zod.string().min(1),
  toAccount: EntityIdSchema,
  toKeyRefId: zod.string().min(1),
  type: zod.nativeEnum(SwapTransferType),
  amount: zod
    .string()
    .min(1)
    .describe(
      'Amount in base units (tinybar or smallest token unit) as string',
    ),
  tokenId: EntityIdSchema.optional(),
});

export const SwapDataSchema = zod.object({
  name: AliasNameSchema,
  network: NetworkSchema,
  executed: zod.boolean().default(false),
  createdAt: zod.string(),
  transfers: zod.array(SwapTransferSchema).default([]),
});

export type SwapTransfer = z.infer<typeof SwapTransferSchema>;
export type SwapData = z.infer<typeof SwapDataSchema>;

export function safeParseSwapData(data: unknown) {
  return SwapDataSchema.safeParse(data);
}
