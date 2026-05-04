import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { SwapEntry, SwapTransfer } from '@/plugins/swap/schema';
import type { SwapListOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';

export async function swapList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const helper = new SwapStateHelper(api.state);
  const swaps = helper.listSwaps();

  const output: SwapListOutput = {
    totalCount: swaps.length,
    swaps: swaps.map(({ name, entry }) => toDisplay(name, entry)),
  };

  return { result: output };
}

function toDisplay(name: string, entry: SwapEntry) {
  return {
    name,
    memo: entry.memo,
    transferCount: entry.transfers.length,
    maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    transfers: entry.transfers.map((t, i) => ({
      index: i + 1,
      type: t.type,
      from: formatAccount(t.from.input, t.from.accountId),
      to: formatAccount(t.to.input, t.to.accountId),
      detail: buildDetail(t),
    })),
  };
}

function buildDetail(t: SwapTransfer): string {
  if (t.type === SwapTransferType.HBAR) return t.amount;
  if (t.type === SwapTransferType.FT)
    return `token: ${formatToken(t.token.input, t.token.tokenId)}  ${t.amount}`;
  return `token: ${formatToken(t.token.input, t.token.tokenId)}  serials: ${t.serials.join(', ')}`;
}
