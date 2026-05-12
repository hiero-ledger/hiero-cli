/**
 * Real implementation of Account Transaction Service
 * Uses Hedera SDK to create actual transactions and queries
 */
import type {
  AccountCreateResult,
  AccountDeleteResult,
  AccountService,
  AccountUpdateResult,
  CreateAccountParams,
  DeleteAccountParams,
  UpdateAccountParams,
} from '@/core';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import {
  AccountCreateTransaction,
  AccountDeleteTransaction,
  AccountId,
  AccountInfoQuery,
  AccountUpdateTransaction,
  Hbar,
  PublicKey,
} from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';

export class AccountServiceImpl implements AccountService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }
  /**
   * Create a new Hedera account
   */
  createAccount(params: CreateAccountParams): AccountCreateResult {
    this.logger.debug(
      `[ACCOUNT TX] Creating account with params: ${JSON.stringify(params)}`,
    );

    try {
      const balance = Hbar.fromTinybars(params.balanceRaw.toString());

      const publicKey = PublicKey.fromString(params.publicKey);
      const transaction = new AccountCreateTransaction().setInitialBalance(
        balance || 0,
      );

      transaction.setKeyWithoutAlias(publicKey);

      if (params.maxAutoAssociations && params.maxAutoAssociations > 0) {
        transaction.setMaxAutomaticTokenAssociations(
          params.maxAutoAssociations,
        );
      }

      this.logger.debug(
        `[ACCOUNT TX] Created transaction for account with key: ${params.publicKey}`,
      );
      return {
        transaction,
        publicKey: params.publicKey,
      };
    } catch (error) {
      throw new ValidationError('Invalid account creation parameters', {
        context: { publicKey: params.publicKey, balance: params.balanceRaw },
        cause: error,
      });
    }
  }

  deleteAccount(params: DeleteAccountParams): AccountDeleteResult {
    this.logger.debug(
      `[ACCOUNT TX] Deleting account ${params.accountId}, transfer to ${params.transferAccountId}`,
    );

    try {
      const transaction = new AccountDeleteTransaction()
        .setAccountId(AccountId.fromString(params.accountId))
        .setTransferAccountId(AccountId.fromString(params.transferAccountId));

      return { transaction };
    } catch (error) {
      throw new ValidationError('Invalid account delete parameters', {
        context: {
          accountId: params.accountId,
          transferAccountId: params.transferAccountId,
        },
        cause: error,
      });
    }
  }

  updateAccount(params: UpdateAccountParams): AccountUpdateResult {
    this.logger.debug(`[ACCOUNT TX] Updating account: ${params.accountId}`);

    try {
      const transaction = new AccountUpdateTransaction().setAccountId(
        params.accountId,
      );

      if (params.key !== undefined) {
        transaction.setKey(PublicKey.fromString(params.key));
      }

      if (params.memo === null) {
        transaction.clearAccountMemo();
      } else if (params.memo !== undefined) {
        transaction.setAccountMemo(params.memo);
      }

      if (params.maxAutoAssociations !== undefined) {
        transaction.setMaxAutomaticTokenAssociations(
          params.maxAutoAssociations,
        );
      }

      if (params.stakedAccountId === null) {
        transaction.clearStakedAccountId();
      } else if (params.stakedAccountId !== undefined) {
        transaction.setStakedAccountId(params.stakedAccountId);
      }

      if (params.stakedNodeId === null) {
        transaction.clearStakedNodeId();
      } else if (params.stakedNodeId !== undefined) {
        transaction.setStakedNodeId(params.stakedNodeId);
      }

      if (params.declineStakingReward !== undefined) {
        transaction.setDeclineStakingReward(params.declineStakingReward);
      }
      if (params.autoRenewPeriod !== undefined) {
        transaction.setAutoRenewPeriod(params.autoRenewPeriod);
      }
      if (params.receiverSignatureRequired !== undefined) {
        transaction.setReceiverSignatureRequired(
          params.receiverSignatureRequired,
        );
      }

      return { transaction };
    } catch (error) {
      throw new ValidationError('Invalid account update parameters', {
        context: { accountId: params.accountId },
        cause: error,
      });
    }
  }

  getAccountInfo(accountId: string): AccountInfoQuery {
    this.logger.debug(`[ACCOUNT TX] Getting account info for: ${accountId}`);

    try {
      const query = new AccountInfoQuery().setAccountId(
        AccountId.fromString(accountId),
      );

      this.logger.debug(
        `[ACCOUNT TX] Created account info query for: ${accountId}`,
      );
      return query;
    } catch (error) {
      throw new ValidationError('Invalid account ID format', {
        context: { accountId },
        cause: error,
      });
    }
  }
}
