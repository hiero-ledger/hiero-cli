import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TransferService } from './transfer-service.interface';
import type {
  CreateFtTransferParams,
  CreateHbarTransferParams,
  SwapTransferParams,
} from './types';

import {
  AccountId,
  Hbar,
  HbarUnit,
  TokenId,
  TransferTransaction,
} from '@hashgraph/sdk';

import { ValidationError } from '@/core/errors';

import { SwapTransferType } from './types';

export class TransferServiceImpl implements TransferService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createHbarTransferTransaction(
    params: CreateHbarTransferParams,
  ): TransferTransaction {
    const { fromAccountId, toAccountId, amount, memo } = params;

    const fromId = AccountId.fromString(fromAccountId);
    const toId = AccountId.fromString(toAccountId);

    this.logger.debug(
      `[TRANSFER SERVICE] Building HBAR transfer: ${amount} tinybar from ${fromAccountId} to ${toAccountId}`,
    );

    const tx = new TransferTransaction()
      .addHbarTransfer(fromId, new Hbar((-amount).toString(), HbarUnit.Tinybar))
      .addHbarTransfer(toId, new Hbar(amount.toString(), HbarUnit.Tinybar));

    if (memo) {
      tx.setTransactionMemo(memo);
    }

    return tx;
  }

  createFtTransferTransaction(
    params: CreateFtTransferParams,
  ): TransferTransaction {
    const { fromAccountId, toAccountId, tokenId, amount } = params;

    this.logger.debug(
      `[TRANSFER SERVICE] Building FT transfer: ${amount} of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
    );

    return new TransferTransaction()
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(fromAccountId),
        -Number(amount),
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(toAccountId),
        Number(amount),
      );
  }

  createAtomicSwapTransaction(
    transfers: SwapTransferParams[],
  ): TransferTransaction {
    this.logger.debug(
      `[TRANSFER SERVICE] Building atomic swap with ${transfers.length} transfer(s)`,
    );

    const tx = new TransferTransaction();

    for (const transfer of transfers) {
      const { type, fromAccountId, toAccountId, amount } = transfer;

      if (type === SwapTransferType.HBAR) {
        tx.addHbarTransfer(
          AccountId.fromString(fromAccountId),
          new Hbar((-amount).toString(), HbarUnit.Tinybar),
        );
        tx.addHbarTransfer(
          AccountId.fromString(toAccountId),
          new Hbar(amount.toString(), HbarUnit.Tinybar),
        );
      } else if (type === SwapTransferType.FT) {
        if (!transfer.tokenId) {
          throw new ValidationError(
            `Token ID is required for FT transfer from ${fromAccountId} to ${toAccountId}`,
          );
        }
        tx.addTokenTransfer(
          TokenId.fromString(transfer.tokenId),
          AccountId.fromString(fromAccountId),
          -Number(amount),
        );
        tx.addTokenTransfer(
          TokenId.fromString(transfer.tokenId),
          AccountId.fromString(toAccountId),
          Number(amount),
        );
      }
    }

    return tx;
  }
}
