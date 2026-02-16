/**
 * Real implementation of HBAR Service
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type {
  HbarService,
  TransferTinybarParams,
  TransferTinybarResult,
} from './hbar-service.interface';

import { AccountId, Hbar, HbarUnit, TransferTransaction } from '@hashgraph/sdk';

import { ValidationError } from '@/core/errors';

export class HbarServiceImpl implements HbarService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  transferTinybar(
    params: TransferTinybarParams,
  ): Promise<TransferTinybarResult> {
    const { amount, from, to, memo } = params;

    this.logger.debug(
      `[HBAR SERVICE] Building transfer: amount=${amount} from=${from} to=${to} memo=${memo || ''}`,
    );

    try {
      const fromId = AccountId.fromString(from);
      const toId = AccountId.fromString(to);

      const tx = new TransferTransaction()
        .addHbarTransfer(
          fromId,
          new Hbar((-amount).toString(), HbarUnit.Tinybar),
        )
        .addHbarTransfer(toId, new Hbar(amount.toString(), HbarUnit.Tinybar));

      if (memo) {
        tx.setTransactionMemo(memo);
      }

      this.logger.debug(
        `[HBAR SERVICE] Created transfer transaction: from=${from} to=${to} amount=${amount}`,
      );

      return Promise.resolve({
        transaction: tx,
      });
    } catch (error) {
      throw new ValidationError('Invalid transfer parameters', {
        context: { from, to, amount: amount.toString() },
        cause: error,
      });
    }
  }
}
