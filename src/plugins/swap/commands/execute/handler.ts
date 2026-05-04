import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  FtSwapTransfer,
  HbarSwapTransfer,
  NftSwapTransfer,
  SwapTransfer,
} from '@/plugins/swap/schema';
import type { SwapExecuteOutput, SwapTransferSummary } from './output';

import { TransactionError, ValidationError } from '@/core/errors';
import {
  FtTransferEntry,
  HbarTransferEntry,
  NftTransferEntry,
} from '@/core/services/transfer';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';

import { SwapExecuteInputSchema } from './input';

export async function swapExecute(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = SwapExecuteInputSchema.parse(args.args);
  const { name } = validArgs;

  const helper = new SwapStateHelper(api.state);
  const swap = helper.getSwapOrThrow(name);

  if (swap.transfers.length === 0) {
    throw new ValidationError(
      `Swap "${name}" has no transfers. Add at least one with: hcli swap add-hbar/add-ft/add-nft -n ${name}`,
    );
  }

  const network = api.network.getCurrentNetwork();

  // Fetch FT decimals for all FT transfers (batch to avoid duplicate requests)
  const ftTokenIds = new Set(
    swap.transfers
      .filter(
        (t): t is FtSwapTransfer =>
          t.type === SwapTransferType.FT && !isRawUnits(t.amount),
      )
      .map((t) => t.token.tokenId),
  );

  const decimalsMap = new Map<string, number>();
  await Promise.all(
    Array.from(ftTokenIds).map(async (tokenId) => {
      const info = await api.mirror.getTokenInfo(tokenId);
      decimalsMap.set(tokenId, parseInt(info.decimals) || 0);
    }),
  );

  // Build transfer entries
  const entries = swap.transfers.flatMap((transfer) =>
    buildEntries(transfer, decimalsMap),
  );

  // Collect unique keyRefIds from all `from` accounts
  const keyRefIds = [...new Set(swap.transfers.map((t) => t.from.keyRefId))];

  // Build and sign transaction
  const transaction = api.transfer.buildTransferTransaction(entries, swap.memo);
  const signed = await api.txSign.sign(transaction, keyRefIds);
  const result = await api.txExecute.execute(signed);

  if (!result.success) {
    throw new TransactionError(
      `Swap "${name}" failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
      false,
    );
  }

  // Remove swap from state after successful execution
  helper.deleteSwap(name);

  const transfers: SwapTransferSummary[] = swap.transfers.map((t) =>
    buildSummary(t),
  );

  const output: SwapExecuteOutput = {
    transactionId: result.transactionId ?? '',
    network,
    swapName: name,
    transferCount: swap.transfers.length,
    transfers,
  };

  return { result: output };
}

function buildEntries(
  transfer: SwapTransfer,
  decimalsMap: Map<string, number>,
): (HbarTransferEntry | FtTransferEntry | NftTransferEntry)[] {
  if (transfer.type === SwapTransferType.HBAR) {
    return [buildHbarEntry(transfer)];
  }
  if (transfer.type === SwapTransferType.FT) {
    return [buildFtEntry(transfer, decimalsMap)];
  }
  return buildNftEntries(transfer);
}

function buildHbarEntry(t: HbarSwapTransfer): HbarTransferEntry {
  return new HbarTransferEntry(
    t.from.accountId,
    t.to.accountId,
    processBalanceInput(t.amount, HBAR_DECIMALS),
  );
}

function buildFtEntry(
  t: FtSwapTransfer,
  decimalsMap: Map<string, number>,
): FtTransferEntry {
  const decimals = decimalsMap.get(t.token.tokenId) ?? 0;
  return new FtTransferEntry(
    t.from.accountId,
    t.to.accountId,
    t.token.tokenId,
    processTokenBalanceInput(t.amount, decimals),
  );
}

function buildNftEntries(t: NftSwapTransfer): NftTransferEntry[] {
  return t.serials.map(
    (serial) =>
      new NftTransferEntry(
        t.from.accountId,
        t.to.accountId,
        t.token.tokenId,
        serial,
      ),
  );
}

function buildSummary(transfer: SwapTransfer): SwapTransferSummary {
  const from = formatAccount(transfer.from.input, transfer.from.accountId);
  const to = formatAccount(transfer.to.input, transfer.to.accountId);

  if (transfer.type === SwapTransferType.HBAR) {
    return { type: SwapTransferType.HBAR, from, to, detail: transfer.amount };
  }
  if (transfer.type === SwapTransferType.FT) {
    const token = formatToken(transfer.token.input, transfer.token.tokenId);
    return {
      type: SwapTransferType.FT,
      from,
      to,
      detail: `token: ${token}  ${transfer.amount}`,
    };
  }
  const token = formatToken(transfer.token.input, transfer.token.tokenId);
  return {
    type: SwapTransferType.NFT,
    from,
    to,
    detail: `token: ${token}  serials: ${transfer.serials.join(', ')}`,
  };
}
