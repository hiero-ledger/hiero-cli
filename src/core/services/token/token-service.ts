/**
 * Implementation of Token Service
 * Handles token-related transaction creation and execution
 */
import type { CustomFee } from '@hashgraph/sdk';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type {
  CustomFee as CustomFeeParams,
  TokenAssociationParams,
  TokenCreateParams,
  TokenTransferParams,
} from '@/core/types/token.types';
import type { TokenService } from './token-service.interface';

import {
  AccountId,
  CustomFixedFee,
  Hbar,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenId,
  TokenSupplyType,
  TransferTransaction,
} from '@hashgraph/sdk';

export class TokenServiceImpl implements TokenService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a token transfer transaction (without execution)
   */
  createTransferTransaction(params: TokenTransferParams): TransferTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating transfer transaction: ${params.amount} tokens from ${params.fromAccountId} to ${params.toAccountId}`,
    );

    const { tokenId, fromAccountId, toAccountId, amount } = params;

    // Create transfer transaction
    const transferTx = new TransferTransaction()
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(fromAccountId),
        Number(-amount), // Negative for sender
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(toAccountId),
        Number(amount), // Positive for receiver
      );

    this.logger.debug(
      `[TOKEN SERVICE] Created transfer transaction for token ${tokenId}`,
    );

    return transferTx;
  }

  /**
   * Create a token creation transaction (without execution)
   */
  createTokenTransaction(params: TokenCreateParams): TokenCreateTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating token: ${params.name} (${params.symbol})`,
    );

    const {
      name,
      symbol,
      treasuryId,
      decimals,
      initialSupplyRaw,
      supplyType,
      maxSupplyRaw,
      adminPublicKey,
      supplyPublicKey,
      wipePublicKey,
      kycPublicKey,
      freezePublicKey,
      pausePublicKey,
      feeSchedulePublicKey,
      customFees,
      memo,
    } = params;

    // Convert supply type string to enum
    const tokenSupplyType =
      supplyType === 'FINITE'
        ? TokenSupplyType.Finite
        : TokenSupplyType.Infinite;

    // Create token creation transaction
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setDecimals(decimals)
      .setInitialSupply(initialSupplyRaw)
      .setSupplyType(tokenSupplyType)
      .setTreasuryAccountId(AccountId.fromString(treasuryId))
      .setAdminKey(adminPublicKey);

    // Set max supply for finite supply tokens
    if (supplyType === 'FINITE' && maxSupplyRaw !== undefined) {
      tokenCreateTx.setMaxSupply(maxSupplyRaw);
      this.logger.debug(
        `[TOKEN SERVICE] Set max supply to ${maxSupplyRaw} for finite supply token`,
      );
    }

    // Set custom fees if provided
    const hederaCustomFees = this.processCustomFees(customFees);
    if (hederaCustomFees.length > 0) {
      tokenCreateTx.setCustomFees(hederaCustomFees);
      this.logger.debug(
        `[TOKEN SERVICE] Set ${hederaCustomFees.length} custom fees`,
      );
    }

    // Set memo if provided
    if (memo) {
      tokenCreateTx.setTokenMemo(memo);
      this.logger.debug(`[TOKEN SERVICE] Set token memo: ${memo}`);
    }

    // Set optional keys if provided
    if (supplyPublicKey) {
      tokenCreateTx.setSupplyKey(supplyPublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set supply key`);
    }

    if (wipePublicKey) {
      tokenCreateTx.setWipeKey(wipePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set wipe key`);
    }

    if (kycPublicKey) {
      tokenCreateTx.setKycKey(kycPublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set KYC key`);
    }

    if (freezePublicKey) {
      tokenCreateTx.setFreezeKey(freezePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set freeze key`);
    }

    if (pausePublicKey) {
      tokenCreateTx.setPauseKey(pausePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set pause key`);
    }

    if (feeSchedulePublicKey) {
      tokenCreateTx.setFeeScheduleKey(feeSchedulePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set fee schedule key`);
    }

    this.logger.debug(
      `[TOKEN SERVICE] Created token creation transaction for ${name}`,
    );

    return tokenCreateTx;
  }

  /**
   * Create a token association transaction (without execution)
   */
  createTokenAssociationTransaction(
    params: TokenAssociationParams,
  ): TokenAssociateTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating association transaction: token ${params.tokenId} with account ${params.accountId}`,
    );

    const { tokenId, accountId } = params;

    // Create token association transaction
    const associateTx = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    this.logger.debug(
      `[TOKEN SERVICE] Created association transaction for token ${tokenId}`,
    );

    return associateTx;
  }

  /**
   * Process custom fees and convert them to Hedera CustomFee objects
   */
  private processCustomFees(customFees?: CustomFeeParams[]): CustomFee[] {
    if (!customFees || customFees.length === 0) {
      return [];
    }

    const hederaCustomFees: CustomFee[] = [];

    for (const fee of customFees) {
      if (fee.type === 'fixed') {
        // Only support HBAR fixed fees
        const fixedFee = new CustomFixedFee();

        // Set HBAR amount (default unitType is HBAR)
        fixedFee.setHbarAmount(Hbar.fromTinybars(fee.amount || 0));
        this.logger.debug(
          `[TOKEN SERVICE] Added fixed HBAR fee: ${fee.amount} tinybars`,
        );

        if (fee.collectorId) {
          fixedFee.setFeeCollectorAccountId(
            AccountId.fromString(fee.collectorId),
          );
        }

        if (fee.exempt !== undefined) {
          fixedFee.setAllCollectorsAreExempt(fee.exempt);
        }

        hederaCustomFees.push(fixedFee);
      }
    }

    return hederaCustomFees;
  }
}
