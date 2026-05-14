import type { SwapEntry, SwapTransfer } from '@/plugins/swap/schema';

export interface SwapStateService {
  getSwap(name: string): SwapEntry | undefined;
  getSwapOrThrow(name: string): SwapEntry;
  saveSwap(name: string, entry: SwapEntry): void;
  deleteSwap(name: string): void;
  listSwaps(): Array<{ name: string; entry: SwapEntry }>;
  exists(name: string): boolean;
  assertCanAdd(name: string, count: number): void;
  addTransfer(name: string, transfer: SwapTransfer): SwapEntry;
}
