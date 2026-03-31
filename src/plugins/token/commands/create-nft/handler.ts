import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenCreateNftOutput } from '@/plugins/token/commands/create-nft/output';
import type {
  TokenCreateNftBuildTransactionResult,
  TokenCreateNftExecuteTransactionResult,
  TokenCreateNftNormalizedParams,
  TokenCreateNftSignTransactionResult,
} from '@/plugins/token/commands/create-nft/types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { TokenCreateNftInputSchema } from '@/plugins/token/commands/create-nft/input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import {
  resolveOptionalKey,
  toPublicKey,
} from '@/plugins/token/utils/token-key-resolver';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

export const TOKEN_CREATE_NFT_COMMAND_NAME = 'token_create-nft';

export class TokenCreateNftCommand extends BaseTransactionCommand<
  TokenCreateNftNormalizedParams,
  TokenCreateNftBuildTransactionResult,
  TokenCreateNftSignTransactionResult,
  TokenCreateNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CREATE_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenCreateNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');
    const maxSupply = validArgs.maxSupply
      ? processTokenBalanceInput(validArgs.maxSupply, 0)
      : undefined;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(validArgs.name, network);

    const treasury = await api.keyResolver.resolveAccountCredentials(
      validArgs.treasury,
      keyManager,
      true,
      ['token:treasury'],
    );
    const admin = await resolveOptionalKey(
      validArgs.adminKey,
      keyManager,
      api.keyResolver,
      'token:admin',
    );
    const supply = await resolveOptionalKey(
      validArgs.supplyKey,
      keyManager,
      api.keyResolver,
      'token:supply',
    );
    const freeze = await resolveOptionalKey(
      validArgs.freezeKey,
      keyManager,
      api.keyResolver,
      'token:freeze',
    );
    const wipe = await resolveOptionalKey(
      validArgs.wipeKey,
      keyManager,
      api.keyResolver,
      'token:wipe',
    );
    const pause = await resolveOptionalKey(
      validArgs.pauseKey,
      keyManager,
      api.keyResolver,
      'token:pause',
    );
    const kyc = await resolveOptionalKey(
      validArgs.kycKey,
      keyManager,
      api.keyResolver,
      'token:kyc',
    );
    const feeSchedule = await resolveOptionalKey(
      validArgs.feeScheduleKey,
      keyManager,
      api.keyResolver,
      'token:feeSchedule',
    );
    const metadata = await resolveOptionalKey(
      validArgs.metadataKey,
      keyManager,
      api.keyResolver,
      'token:metadata',
    );
    const expirationTime = validArgs.expirationTime
      ? new Date(validArgs.expirationTime)
      : undefined;

    let finalMaxSupply: bigint | undefined;
    if (validArgs.supplyType === SupplyType.FINITE) {
      finalMaxSupply = determineFiniteMaxSupply(maxSupply, 0n);
      logger.info(`Max supply: ${finalMaxSupply}`);
    } else if (maxSupply !== undefined) {
      logger.warn(
        'Max supply specified for INFINITE supply type - ignoring max supply parameter',
      );
    }

    logger.info(`Creating NFT: ${validArgs.tokenName} (${validArgs.symbol})`);
    logger.debug('=== NFT PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury.keyRefId}`);
    logger.debug(`Admin Key (keyRefId): ${admin?.keyRefId}`);
    logger.debug(`Supply Key (keyRefId): ${supply?.keyRefId}`);
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

    const adminKeyRefIds = admin ? [admin.keyRefId] : [];
    const supplyKeyRefIds = supply ? [supply.keyRefId] : [];

    return {
      name: validArgs.tokenName,
      symbol: validArgs.symbol,
      decimals: 0,
      initialSupply: 0n,
      tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
      supplyType: validArgs.supplyType,
      alias: validArgs.name,
      memo: validArgs.memo,
      network,
      keyManager,
      treasury,
      admin,
      supply,
      freeze,
      wipe,
      pause,
      kyc,
      feeSchedule,
      metadata,
      finalMaxSupply,
      freezeDefault: validArgs.freezeDefault,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      autoRenewAccountId: validArgs.autoRenewAccountId,
      expirationTime,
      keyRefIds: [treasury.keyRefId, ...adminKeyRefIds, ...supplyKeyRefIds],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateNftNormalizedParams,
  ): Promise<TokenCreateNftBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createTokenTransaction({
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupplyRaw: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType,
      maxSupplyRaw: normalisedParams.finalMaxSupply,
      adminPublicKey: normalisedParams.admin
        ? PublicKey.fromString(normalisedParams.admin.publicKey)
        : undefined,
      supplyPublicKey: toPublicKey(normalisedParams.supply),
      freezePublicKey: toPublicKey(normalisedParams.freeze),
      wipePublicKey: toPublicKey(normalisedParams.wipe),
      pausePublicKey: toPublicKey(normalisedParams.pause),
      kycPublicKey: toPublicKey(normalisedParams.kyc),
      feeSchedulePublicKey: toPublicKey(normalisedParams.feeSchedule),
      metadataPublicKey: toPublicKey(normalisedParams.metadata),
      freezeDefault: normalisedParams.freezeDefault,
      autoRenewPeriod: normalisedParams.autoRenewPeriod,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      expirationTime: normalisedParams.expirationTime,
      memo: normalisedParams.memo,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateNftNormalizedParams,
    buildTransactionResult: TokenCreateNftBuildTransactionResult,
  ): Promise<TokenCreateNftSignTransactionResult> {
    const { api } = args;
    const txSigners = [normalisedParams.treasury.keyRefId];

    if (normalisedParams.admin) {
      txSigners.push(normalisedParams.admin.keyRefId);
    }

    if (normalisedParams.supply) {
      txSigners.push(normalisedParams.supply.keyRefId);
    }

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      txSigners,
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: TokenCreateNftNormalizedParams,
    _buildTransactionResult: TokenCreateNftBuildTransactionResult,
    signTransactionResult: TokenCreateNftSignTransactionResult,
  ): Promise<TokenCreateNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!transactionResult.success || !transactionResult.tokenId) {
      throw new StateError('NFT creation completed but no token ID returned', {
        context: { transactionId: transactionResult.transactionId },
      });
    }

    return { transactionResult };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateNftNormalizedParams,
    _buildTransactionResult: TokenCreateNftBuildTransactionResult,
    _signTransactionResult: TokenCreateNftSignTransactionResult,
    executeTransactionResult: TokenCreateNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildTokenData(result, {
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType,
      adminPublicKey: normalisedParams.admin?.publicKey,
      supplyPublicKey: normalisedParams.supply?.publicKey,
      freezePublicKey: normalisedParams.freeze?.publicKey,
      wipePublicKey: normalisedParams.wipe?.publicKey,
      pausePublicKey: normalisedParams.pause?.publicKey,
      kycPublicKey: normalisedParams.kyc?.publicKey,
      feeSchedulePublicKey: normalisedParams.feeSchedule?.publicKey,
      metadataPublicKey: normalisedParams.metadata?.publicKey,
      network: normalisedParams.network,
    });

    const key = composeKey(normalisedParams.network, result.tokenId!);
    tokenState.saveToken(key, tokenData);
    logger.info('   Non-fungible token data saved to state');

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Token,
        network: normalisedParams.network,
        entityId: result.tokenId!,
        createdAt: result.consensusTimestamp,
      });
      logger.info(`   Name registered: ${normalisedParams.alias}`);
    }

    const outputData: TokenCreateNftOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      adminPublicKey: normalisedParams.admin?.publicKey,
      supplyPublicKey: normalisedParams.supply?.publicKey,
      freezePublicKey: normalisedParams.freeze?.publicKey,
      wipePublicKey: normalisedParams.wipe?.publicKey,
      pausePublicKey: normalisedParams.pause?.publicKey,
      kycPublicKey: normalisedParams.kyc?.publicKey,
      feeSchedulePublicKey: normalisedParams.feeSchedule?.publicKey,
      metadataPublicKey: normalisedParams.metadata?.publicKey,
      alias: normalisedParams.alias,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenCreateNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCreateNftCommand().execute(args);
}
