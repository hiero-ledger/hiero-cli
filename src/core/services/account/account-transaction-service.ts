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

import { KeyAlgorithm } from '@/core/shared/constants';

export class AccountServiceImpl implements AccountService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }
  /**
   * Create a new Hedera account
   */
  createAccount(params: CreateAccountParams): Promise<AccountCreateResult> {
    this.logger.debug(
      `[ACCOUNT TX] Creating account with params: ${JSON.stringify(params)}`,
    );

    const balance = Hbar.fromTinybars(params.balanceRaw.toString());

    // Create the account creation transaction
    const publicKey = PublicKey.fromString(params.publicKey);
    const transaction = new AccountCreateTransaction().setInitialBalance(
      balance || 0,
    );

    // Set the key based on the keyType parameter (defaults to ecdsa if not specified)
    const keyType = params.keyType || KeyAlgorithm.ECDSA;
    if (keyType === KeyAlgorithm.ECDSA) {
      transaction.setECDSAKeyWithAlias(publicKey);
    } else {
      transaction.setKeyWithoutAlias(publicKey);
    }

    // Set max automatic token associations if specified
    if (params.maxAutoAssociations && params.maxAutoAssociations > 0) {
      transaction.setMaxAutomaticTokenAssociations(params.maxAutoAssociations);
    }

    this.logger.debug(
      `[ACCOUNT TX] Created transaction for account with key: ${params.publicKey}`,
    );

    return Promise.resolve({
      transaction,
      publicKey: params.publicKey,
    });
  }

  /**
   * Get account information
   */
  getAccountInfo(accountId: string): Promise<AccountInfoQuery> {
    this.logger.debug(`[ACCOUNT TX] Getting account info for: ${accountId}`);

    // Create account info query
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromString(accountId),
    );

    this.logger.debug(
      `[ACCOUNT TX] Created account info query for: ${accountId}`,
    );
    return Promise.resolve(query);
  }

  /**
   * Get account balance
   */
  getAccountBalance(
    accountId: string,
    tokenId?: string,
  ): Promise<AccountBalanceQuery> {
    this.logger.debug(
      `[ACCOUNT TX] Getting account balance for: ${accountId}${tokenId ? `, token: ${tokenId}` : ''}`,
    );

    // Create account balance query
    const query = new AccountBalanceQuery().setAccountId(
      AccountId.fromString(accountId),
    );

    // Note: AccountBalanceQuery doesn't support token-specific queries
    // Token balances are included in the general account balance response
    if (tokenId) {
      this.logger.debug(
        `[ACCOUNT TX] Note: Token ID ${tokenId} specified but AccountBalanceQuery returns all token balances`,
      );
    }

    this.logger.debug(
      `[ACCOUNT TX] Created account balance query for: ${accountId}`,
    );
    return Promise.resolve(query);
  }
}
