/**
 * Real implementation of Account Transaction Service
 * Uses Hedera SDK to create actual transactions and queries
 */
import type {
  AccountCreateResult,
  AccountService,
  CreateAccountParams,
} from '@/core';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import {
  AccountBalanceQuery,
  AccountCreateTransaction,
  AccountId,
  AccountInfoQuery,
  Hbar,
  PublicKey,
} from '@hashgraph/sdk';

import { ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';

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

      const keyType = params.keyType || KeyAlgorithm.ECDSA;
      if (keyType === KeyAlgorithm.ECDSA) {
        transaction.setECDSAKeyWithAlias(publicKey);
      } else {
        transaction.setKeyWithoutAlias(publicKey);
      }

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

  /**
   * Get account information
   */
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

  /**
   * Get account balance
   */
  getAccountBalance(accountId: string, tokenId?: string): AccountBalanceQuery {
    this.logger.debug(
      `[ACCOUNT TX] Getting account balance for: ${accountId}${tokenId ? `, token: ${tokenId}` : ''}`,
    );

    try {
      const query = new AccountBalanceQuery().setAccountId(
        AccountId.fromString(accountId),
      );

      if (tokenId) {
        this.logger.debug(
          `[ACCOUNT TX] Note: Token ID ${tokenId} specified but AccountBalanceQuery returns all token balances`,
        );
      }

      this.logger.debug(
        `[ACCOUNT TX] Created account balance query for: ${accountId}`,
      );
      return query;
    } catch (error) {
      throw new ValidationError('Invalid account ID format', {
        context: { accountId, tokenId },
        cause: error,
      });
    }
  }
}
