/**
 * Real implementation of HBAR Service
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type {
  HbarAllowanceParams,
  HbarAllowanceResult,
  HbarService,
  TransferTinybarParams,
  TransferTinybarResult,
} from './hbar-service.interface';

import {
  AccountAllowanceApproveTransaction,
  AccountId,
  Hbar,
  HbarUnit,
  TransferTransaction,
} from '@hashgraph/sdk';

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

  createHbarAllowanceTransaction(
    params: HbarAllowanceParams,
  ): HbarAllowanceResult {
    const { ownerAccountId, spenderAccountId, amountTinybar } = params;

    this.logger.debug(
      `[HBAR SERVICE] Building allowance: owner=${ownerAccountId} spender=${spenderAccountId} amount=${amountTinybar}`,
    );

    try {
      const tx = new AccountAllowanceApproveTransaction().approveHbarAllowance(
        AccountId.fromString(ownerAccountId),
        AccountId.fromString(spenderAccountId),
        new Hbar(amountTinybar.toString(), HbarUnit.Tinybar),
      );

      this.logger.debug(
        `[HBAR SERVICE] Created allowance transaction: owner=${ownerAccountId} spender=${spenderAccountId}`,
      );

      return { transaction: tx };
    } catch (error) {
      throw new ValidationError('Invalid allowance parameters', {
        context: {
          ownerAccountId,
          spenderAccountId,
          amountTinybar: amountTinybar.toString(),
        },
        cause: error,
      });
    }
  }
}
