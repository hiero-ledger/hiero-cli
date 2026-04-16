/**
 * Implementation of Token Service
 * Handles token-related transaction creation and execution
 */
import type { CustomFee } from '@hashgraph/sdk';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type {
  CustomFee as CustomFeeParams,
  NftAllowanceApproveParams,
  NftAllowanceDeleteParams,
  NftTransferParams,
  TokenAirdropFtParams,
  TokenAirdropNftParams,
  TokenAllowanceFtParams,
  TokenAssociationParams,
  TokenClaimAirdropParams,
  TokenCreateParams,
  TokenDeleteParams,
  TokenFreezeParams,
  TokenMintParams,
  TokenTransferParams,
  TokenUnfreezeParams,
} from '@/core/types/token.types';
import type { TokenService } from './token-service.interface';

import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  CustomFixedFee,
  CustomFractionalFee,
  FeeAssessmentMethod,
  Hbar,
  NftId,
  PendingAirdropId,
  TokenAirdropTransaction,
  TokenAssociateTransaction,
  TokenClaimAirdropTransaction,
  TokenCreateTransaction,
  TokenDeleteTransaction,
  TokenFreezeTransaction,
  TokenId,
  TokenMintTransaction,
  TokenSupplyType,
  TokenUnfreezeTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';

import { TokenTypeMap } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { CustomFeeType, FixedFeeUnitType } from '@/core/types/token.types';

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
      tokenType,
      supplyType,
      maxSupplyRaw,
      adminPublicKey,
      supplyPublicKey,
      wipePublicKey,
      kycPublicKey,
      freezePublicKey,
      pausePublicKey,
      feeSchedulePublicKey,
      metadataPublicKey,
      freezeDefault,
      customFees,
      memo,
      autoRenewPeriodSeconds,
      autoRenewAccountId,
      expirationTime,
    } = params;

    // Convert supply type string to enum
    const tokenSupplyType =
      supplyType === SupplyType.FINITE
        ? TokenSupplyType.Finite
        : TokenSupplyType.Infinite;

    // Create token creation transaction
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setDecimals(decimals)
      .setTokenType(TokenTypeMap[tokenType])
      .setInitialSupply(initialSupplyRaw)
      .setSupplyType(tokenSupplyType)
      .setTreasuryAccountId(AccountId.fromString(treasuryId));

    if (adminPublicKey) {
      tokenCreateTx.setAdminKey(adminPublicKey);
    }

    // Set max supply for finite supply tokens
    if (supplyType === SupplyType.FINITE && maxSupplyRaw !== undefined) {
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
      tokenCreateTx.setFreezeDefault(freezeDefault ?? false);
      this.logger.debug(
        `[TOKEN SERVICE] Set freeze default: ${String(freezeDefault ?? false)}`,
      );
    }

    if (pausePublicKey) {
      tokenCreateTx.setPauseKey(pausePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set pause key`);
    }

    if (feeSchedulePublicKey) {
      tokenCreateTx.setFeeScheduleKey(feeSchedulePublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set fee schedule key`);
    }

    if (metadataPublicKey) {
      tokenCreateTx.setMetadataKey(metadataPublicKey);
      this.logger.debug(`[TOKEN SERVICE] Set metadata key`);
    }

    if (freezeDefault !== undefined) {
      tokenCreateTx.setFreezeDefault(freezeDefault);
      this.logger.debug(`[TOKEN SERVICE] Set freeze default: ${freezeDefault}`);
    }

    if (autoRenewPeriodSeconds && autoRenewAccountId) {
      tokenCreateTx
        .setAutoRenewAccountId(AccountId.fromString(autoRenewAccountId))
        .setAutoRenewPeriod(autoRenewPeriodSeconds);
      this.logger.debug(
        `[TOKEN SERVICE] Set auto-renew: account ${autoRenewAccountId}, period ${String(autoRenewPeriodSeconds)}s`,
      );
    } else if (expirationTime) {
      tokenCreateTx.setExpirationTime(expirationTime);
      this.logger.debug(
        `[TOKEN SERVICE] Set expiration time: ${expirationTime.toISOString()}`,
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
   * Create a token mint transaction (without execution)
   * Supports both fungible tokens (with amount) and NFTs (with metadata)
   */
  createMintTransaction(params: TokenMintParams): TokenMintTransaction {
    const tokenId = params.tokenId;
    const amount = params.amount;
    const metadata = params.metadata;

    const mintTx = new TokenMintTransaction().setTokenId(
      TokenId.fromString(tokenId),
    );

    if (amount !== undefined) {
      // FT minting
      this.logger.debug(
        `[TOKEN SERVICE] Creating FT mint transaction: ${amount.toString()} tokens for token ${tokenId}`,
      );
      mintTx.setAmount(amount);
      this.logger.debug(
        `[TOKEN SERVICE] Created FT mint transaction for token ${tokenId}`,
      );
    } else {
      // NFT minting
      this.logger.debug(
        `[TOKEN SERVICE] Creating NFT mint transaction for token ${tokenId} with metadata (${metadata!.length} bytes)`,
      );
      mintTx.addMetadata(metadata!);
      this.logger.debug(
        `[TOKEN SERVICE] Created NFT mint transaction for token ${tokenId}`,
      );
    }

    return mintTx;
  }

  /**
   * Create an NFT transfer transaction (without execution)
   */
  createNftTransferTransaction(params: NftTransferParams): TransferTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating NFT transfer transaction: ${params.serialNumbers.length} NFTs of token ${params.tokenId} from ${params.fromAccountId} to ${params.toAccountId}`,
    );

    const { tokenId, fromAccountId, toAccountId, serialNumbers } = params;

    const transferTx = new TransferTransaction();

    for (const serial of serialNumbers) {
      const nftId = new NftId(TokenId.fromString(tokenId), serial);
      transferTx.addNftTransfer(
        nftId,
        AccountId.fromString(fromAccountId),
        AccountId.fromString(toAccountId),
      );
    }

    this.logger.debug(
      `[TOKEN SERVICE] Created NFT transfer transaction for ${serialNumbers.length} NFTs`,
    );

    return transferTx;
  }

  createFungibleTokenAllowanceTransaction(
    params: TokenAllowanceFtParams,
  ): AccountAllowanceApproveTransaction {
    const { tokenId, ownerAccountId, spenderAccountId, amount } = params;
    this.logger.debug(
      `[TOKEN SERVICE] Creating FT allowance: ${amount.toString()} tokens of ${tokenId} from ${ownerAccountId} to spender ${spenderAccountId}`,
    );
    return new AccountAllowanceApproveTransaction().approveTokenAllowance(
      TokenId.fromString(tokenId),
      AccountId.fromString(ownerAccountId),
      AccountId.fromString(spenderAccountId),
      amount,
    );
  }

  createNftAllowanceApproveTransaction(
    params: NftAllowanceApproveParams,
  ): AccountAllowanceApproveTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating NFT allowance approve transaction: token ${params.tokenId}, owner ${params.ownerAccountId}, spender ${params.spenderAccountId}`,
    );

    const tx = new AccountAllowanceApproveTransaction();
    const tokenId = TokenId.fromString(params.tokenId);
    const owner = AccountId.fromString(params.ownerAccountId);
    const spender = AccountId.fromString(params.spenderAccountId);

    if (params.allSerials) {
      tx.approveTokenNftAllowanceAllSerials(tokenId, owner, spender);
      this.logger.debug(
        `[TOKEN SERVICE] Approved all serials for token ${params.tokenId}`,
      );
    } else {
      for (const serial of params.serialNumbers) {
        tx.approveTokenNftAllowance(new NftId(tokenId, serial), owner, spender);
      }
      this.logger.debug(
        `[TOKEN SERVICE] Approved ${params.serialNumbers.length} serial(s) for token ${params.tokenId}`,
      );
    }

    return tx;
  }

  createNftAllowanceDeleteTransaction(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction {
    const tokenId = TokenId.fromString(params.tokenId);
    const owner = AccountId.fromString(params.ownerAccountId);

    if (params.allSerials) {
      this.logger.debug(
        `[TOKEN SERVICE] Revoking all-serials NFT allowance: token ${params.tokenId}, owner ${params.ownerAccountId}, spender ${params.spenderAccountId}`,
      );
      return new AccountAllowanceApproveTransaction().deleteTokenNftAllowanceAllSerials(
        tokenId,
        owner,
        AccountId.fromString(params.spenderAccountId),
      );
    }

    this.logger.debug(
      `[TOKEN SERVICE] Deleting NFT allowance for ${params.serialNumbers.length} serial(s) of token ${params.tokenId}`,
    );
    const tx = new AccountAllowanceDeleteTransaction();
    for (const serial of params.serialNumbers) {
      tx.deleteAllTokenNftAllowances(new NftId(tokenId, serial), owner);
    }
    return tx;
  }

  createDeleteTransaction(params: TokenDeleteParams): TokenDeleteTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating delete transaction for token ${params.tokenId}`,
    );
    return new TokenDeleteTransaction().setTokenId(
      TokenId.fromString(params.tokenId),
    );
  }

  createFreezeTransaction(params: TokenFreezeParams): TokenFreezeTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating freeze transaction for account ${params.accountId} on token ${params.tokenId}`,
    );
    return new TokenFreezeTransaction()
      .setTokenId(TokenId.fromString(params.tokenId))
      .setAccountId(AccountId.fromString(params.accountId));
  }

  createUnfreezeTransaction(
    params: TokenUnfreezeParams,
  ): TokenUnfreezeTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating unfreeze transaction for account ${params.accountId} on token ${params.tokenId}`,
    );
    return new TokenUnfreezeTransaction()
      .setTokenId(TokenId.fromString(params.tokenId))
      .setAccountId(AccountId.fromString(params.accountId));
  }

  createAirdropFtTransaction(
    params: TokenAirdropFtParams,
  ): TokenAirdropTransaction {
    const { tokenId, senderAccountId, transfers } = params;
    const tid = TokenId.fromString(tokenId);
    const sender = AccountId.fromString(senderAccountId);

    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0n);

    this.logger.debug(
      `[TOKEN SERVICE] Creating airdrop transaction: ${totalAmount} tokens of ${tokenId} from ${senderAccountId} to ${transfers.length} recipient(s)`,
    );

    const tx = new TokenAirdropTransaction().addTokenTransfer(
      tid,
      sender,
      -totalAmount,
    );

    for (const transfer of transfers) {
      tx.addTokenTransfer(
        tid,
        AccountId.fromString(transfer.recipientAccountId),
        transfer.amount,
      );
    }

    return tx;
  }

  createAirdropNftTransaction(
    params: TokenAirdropNftParams,
  ): TokenAirdropTransaction {
    const { tokenId, senderAccountId, transfers } = params;
    const tid = TokenId.fromString(tokenId);
    const sender = AccountId.fromString(senderAccountId);

    this.logger.debug(
      `[TOKEN SERVICE] Creating NFT airdrop transaction: ${tokenId} from ${senderAccountId} to ${transfers.length} recipient(s)`,
    );

    const tx = new TokenAirdropTransaction();
    for (const transfer of transfers) {
      const recipient = AccountId.fromString(transfer.recipientAccountId);
      for (const serial of transfer.serialNumbers) {
        tx.addNftTransfer(new NftId(tid, serial), sender, recipient);
      }
    }
    return tx;
  }

  createClaimAirdropTransaction(
    params: TokenClaimAirdropParams,
  ): TokenClaimAirdropTransaction {
    this.logger.debug(
      `[TOKEN SERVICE] Creating claim airdrop transaction for ${params.items.length} pending airdrop(s)`,
    );

    const tx = new TokenClaimAirdropTransaction();

    for (const item of params.items) {
      const tokenId = TokenId.fromString(item.tokenId);
      const sender = AccountId.fromString(item.senderAccountId);
      const receiver = AccountId.fromString(item.receiverAccountId);

      const pendingId =
        item.serialNumber !== undefined
          ? new PendingAirdropId({
              nftId: new NftId(tokenId, item.serialNumber),
              senderId: sender,
              receiverId: receiver,
            })
          : new PendingAirdropId({
              tokenId,
              senderId: sender,
              receiverId: receiver,
            });

      tx.addPendingAirdropId(pendingId);
    }

    return tx;
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
      if (fee.type === CustomFeeType.FIXED) {
        const fixedFee = new CustomFixedFee();

        if (fee.unitType === FixedFeeUnitType.TOKEN) {
          fixedFee.setDenominatingTokenToSameToken();
          fixedFee.setAmount(fee.amount || 0);
          this.logger.debug(
            `[TOKEN SERVICE] Added fixed TOKEN fee: ${fee.amount} units`,
          );
        } else {
          fixedFee.setHbarAmount(Hbar.fromTinybars(fee.amount || 0));
          this.logger.debug(
            `[TOKEN SERVICE] Added fixed HBAR fee: ${fee.amount} tinybars`,
          );
        }

        fixedFee.setFeeCollectorAccountId(
          AccountId.fromString(fee.collectorId),
        );

        fixedFee.setAllCollectorsAreExempt(fee.exempt);

        hederaCustomFees.push(fixedFee);
      } else if (fee.type === CustomFeeType.FRACTIONAL) {
        const fractionalFee = new CustomFractionalFee()
          .setNumerator(fee.numerator)
          .setDenominator(fee.denominator);

        if (fee.min !== undefined) {
          fractionalFee.setMin(fee.min);
        }

        if (fee.max !== undefined) {
          fractionalFee.setMax(fee.max);
        }

        const assessmentMethod = fee.netOfTransfers
          ? FeeAssessmentMethod.Inclusive
          : FeeAssessmentMethod.Exclusive;
        fractionalFee.setAssessmentMethod(assessmentMethod);

        fractionalFee.setFeeCollectorAccountId(
          AccountId.fromString(fee.collectorId),
        );

        fractionalFee.setAllCollectorsAreExempt(fee.exempt);

        this.logger.debug(
          `[TOKEN SERVICE] Added fractional fee: ${fee.numerator}/${fee.denominator}, netOfTransfers=${fee.netOfTransfers}`,
        );

        hederaCustomFees.push(fractionalFee);
      }
    }

    return hederaCustomFees;
  }
}
