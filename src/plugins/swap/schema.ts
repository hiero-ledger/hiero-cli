import { z } from 'zod';

export enum SwapTransferType {
  HBAR = 'hbar',
  FT = 'ft',
  NFT = 'nft',
}

export const SwapFromAccountSchema = z.object({
  input: z.string(),
  accountId: z.string(),
  keyRefId: z.string(),
});

export const SwapToAccountSchema = z.object({
  input: z.string(),
  accountId: z.string(),
});

export const SwapTokenSchema = z.object({
  input: z.string(),
  tokenId: z.string(),
});

export const HbarSwapTransferSchema = z.object({
  type: z.literal(SwapTransferType.HBAR),
  from: SwapFromAccountSchema,
  to: SwapToAccountSchema,
  amount: z.string(),
});

export const FtSwapTransferSchema = z.object({
  type: z.literal(SwapTransferType.FT),
  from: SwapFromAccountSchema,
  to: SwapToAccountSchema,
  token: SwapTokenSchema,
  amount: z.string(),
});

export const NftSwapTransferSchema = z.object({
  type: z.literal(SwapTransferType.NFT),
  from: SwapFromAccountSchema,
  to: SwapToAccountSchema,
  token: SwapTokenSchema,
  serials: z.array(z.number()),
});

export const SwapTransferSchema = z.discriminatedUnion('type', [
  HbarSwapTransferSchema,
  FtSwapTransferSchema,
  NftSwapTransferSchema,
]);

export const SwapEntrySchema = z.object({
  memo: z.string().optional(),
  transfers: z.array(SwapTransferSchema),
});

export type SwapFromAccount = z.infer<typeof SwapFromAccountSchema>;
export type SwapToAccount = z.infer<typeof SwapToAccountSchema>;
export type SwapToken = z.infer<typeof SwapTokenSchema>;
export type HbarSwapTransfer = z.infer<typeof HbarSwapTransferSchema>;
export type FtSwapTransfer = z.infer<typeof FtSwapTransferSchema>;
export type NftSwapTransfer = z.infer<typeof NftSwapTransferSchema>;
export type SwapTransfer = z.infer<typeof SwapTransferSchema>;
export type SwapEntry = z.infer<typeof SwapEntrySchema>;
