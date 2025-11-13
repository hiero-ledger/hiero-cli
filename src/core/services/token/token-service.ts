/**
 * Implementation of Token Service
 * Handles token-related transaction creation and execution
 */
import {
  TransferTransaction,
  TokenCreateTransaction,
  TokenAssociateTransaction,
  AccountId,
  TokenId,
  PublicKey,
  TokenSupplyType,
  CustomFee,
  CustomFixedFee,
  Hbar,
} from '@hashgraph/sdk';
import { Logger } from '../logger/logger-service.interface';
import { TokenService } from './token-service.interface';
import type {
  TokenTransferParams,
  TokenCreateParams,
  TokenAssociationParams,
  CustomFee as CustomFeeParams,
} from '../../types/token.types';
import { parsePrivateKey } from '../../../utils/keys';

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
        -amount, // Negative for sender
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(toAccountId),
        amount, // Positive for receiver
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
      adminKey,
      customFees,
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
      .setInitialSupply(initialSupplyRaw.toString())
      .setSupplyType(tokenSupplyType)
      .setTreasuryAccountId(AccountId.fromString(treasuryId))
      .setAdminKey(this.parseKeyToPublic(adminKey));

    // Set max supply for finite supply tokens
    if (supplyType === 'FINITE' && maxSupplyRaw !== undefined) {
      tokenCreateTx.setMaxSupply(maxSupplyRaw.toString());
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
   * Parse a key string to PublicKey
   * Handles both public keys and private keys (extracts public key from private)
   */
  private parseKeyToPublic(key: string) {
    try {
      // Try to parse as private key first (for backwards compatibility)
      return parsePrivateKey(key).publicKey;
    } catch {
      // If that fails, try to parse as public key directly
      try {
        return PublicKey.fromString(key);
      } catch {
        throw new Error(`Invalid key format: ${key}`);
      }
    }
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
