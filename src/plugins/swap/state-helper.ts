import type { StateService } from '@/core/services/state/state-service.interface';
import type { SwapEntry, SwapTransfer } from './schema';

import { NotFoundError, ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';

import { SwapEntrySchema } from './schema';

export const SWAP_STATE_NAMESPACE = 'swap';

export class SwapStateHelper {
  constructor(private readonly state: StateService) {}

  getSwap(name: string): SwapEntry | undefined {
    const raw = this.state.get<SwapEntry>(SWAP_STATE_NAMESPACE, name);
    if (!raw) return undefined;
    return SwapEntrySchema.parse(raw);
  }

  getSwapOrThrow(name: string): SwapEntry {
    const swap = this.getSwap(name);
    if (!swap) {
      throw new NotFoundError(
        `Swap "${name}" not found. Create it first with: hcli swap create -n ${name}`,
      );
    }
    return swap;
  }

  saveSwap(name: string, entry: SwapEntry): void {
    this.state.set(SWAP_STATE_NAMESPACE, name, entry);
  }

  deleteSwap(name: string): void {
    this.state.delete(SWAP_STATE_NAMESPACE, name);
  }

  listSwaps(): Array<{ name: string; entry: SwapEntry }> {
    return this.state.getKeys(SWAP_STATE_NAMESPACE).map((key) => ({
      name: key,
      entry: SwapEntrySchema.parse(
        this.state.get<SwapEntry>(SWAP_STATE_NAMESPACE, key),
      ),
    }));
  }

  exists(name: string): boolean {
    return this.getSwap(name) !== undefined;
  }

  assertCanAdd(name: string, count: number): void {
    const swap = this.getSwapOrThrow(name);
    const current = swap.transfers.length;
    const remaining = HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION - current;
    if (count > remaining) {
      throw new ValidationError(
        `Cannot add ${count} transfer(s) to swap "${name}": ${current}/${HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION} slots used, ${remaining} remaining.`,
      );
    }
  }

  addTransfer(name: string, transfer: SwapTransfer): SwapEntry {
    const swap = this.getSwapOrThrow(name);
    const updated: SwapEntry = {
      ...swap,
      transfers: [...swap.transfers, transfer],
    };
    this.saveSwap(name, updated);
    return updated;
  }
}
