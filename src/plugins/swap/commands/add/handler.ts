import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SwapAddOutput } from './output';

import { NotFoundError, ValidationError } from '@/core/errors';
import { SwapTransferType } from '@/core/services/transfer/types';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { ZustandSwapStateHelper } from '@/plugins/swap/zustand-state-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';

import { SwapAddInputSchema } from './input';

export class SwapAddCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const validArgs = SwapAddInputSchema.parse(args.args);

    const {
      swap: swapName,
      from,
      to,
      type,
      amount: amountInput,
      tokenId,
    } = validArgs;

    const keyManager: KeyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, swapName);

    const swapData = swapState.getSwap(key);
    if (!swapData) {
      throw new NotFoundError(`Swap not found: '${swapName}'`, {
        context: { swapName },
      });
    }
    if (swapData.executed) {
      throw new ValidationError(
        `Cannot add transfers to an already executed swap '${swapName}'`,
      );
    }

    if (type === SwapTransferType.FT && !tokenId) {
      throw new ValidationError('--token-id is required when --type is ft');
    }

    // Resolve amount
    let rawAmount: bigint;
    if (type === SwapTransferType.HBAR) {
      rawAmount = processBalanceInput(amountInput, HBAR_DECIMALS);
    } else {
      let tokenDecimals = 0;
      if (!isRawUnits(amountInput)) {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId!);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }
      rawAmount = processTokenBalanceInput(amountInput, tokenDecimals);
    }

    // Both sides must sign — resolve credentials (private key in KMS) for both accounts
    const resolvedFrom = await api.keyResolver.resolveAccountCredentials(
      from,
      keyManager,
      true,
      ['swap:sender'],
    );
    const resolvedTo = await api.keyResolver.resolveAccountCredentials(
      to,
      keyManager,
      true,
      ['swap:receiver'],
    );

    if (resolvedFrom.accountId === resolvedTo.accountId) {
      throw new ValidationError('Cannot transfer to the same account');
    }

    // Validate token association for FT transfers
    if (type === SwapTransferType.FT) {
      const toBalances = await api.mirror.getAccountTokenBalances(
        resolvedTo.accountId,
        tokenId,
      );
      if (!toBalances || toBalances.tokens.length === 0) {
        throw new ValidationError(
          `Account '${resolvedTo.accountId}' is not associated with token '${tokenId}'. Associate first with: hiero token associate`,
        );
      }
    }

    const newTransfer = {
      fromAccount: resolvedFrom.accountId,
      fromKeyRefId: resolvedFrom.keyRefId,
      toAccount: resolvedTo.accountId,
      toKeyRefId: resolvedTo.keyRefId,
      type,
      amount: rawAmount.toString(),
      ...(tokenId && { tokenId }),
    };

    const updatedSwap = {
      ...swapData,
      transfers: [...swapData.transfers, newTransfer],
    };

    swapState.saveSwap(key, updatedSwap);

    logger.info(
      `[SWAP] Added ${type} transfer to swap '${swapName}': ${resolvedFrom.accountId} → ${resolvedTo.accountId}`,
    );

    const output: SwapAddOutput = {
      swapName,
      fromAccount: resolvedFrom.accountId,
      toAccount: resolvedTo.accountId,
      type,
      amount: rawAmount.toString(),
      ...(tokenId && { tokenId }),
      transferIndex: updatedSwap.transfers.length,
    };

    return { result: output };
  }
}

export async function swapAdd(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapAddCommand().execute(args);
}
