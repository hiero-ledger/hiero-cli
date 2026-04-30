import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenCreateNftOutput } from '@/plugins/token/commands/create-nft/output';
import type {
  TokenCreateNftBuildTransactionResult,
  TokenCreateNftExecuteTransactionResult,
  TokenCreateNftNormalizedParams,
  TokenCreateNftSignTransactionResult,
} from '@/plugins/token/commands/create-nft/types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { AliasType, SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { TokenCreateNftInputSchema } from '@/plugins/token/commands/create-nft/input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { resolveOptionalKeys } from '@/plugins/token/utils/token-key-resolver';
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

    const admin = await resolveOptionalKeys(
      validArgs.adminKey,
      keyManager,
      api.keyResolver,
      'token:admin',
    );

    const supply = await resolveOptionalKeys(
      validArgs.supplyKey,
      keyManager,
      api.keyResolver,
      'token:supply',
    );

    const freeze = await resolveOptionalKeys(
      validArgs.freezeKey,
      keyManager,
      api.keyResolver,
      'token:freeze',
    );

    const wipe = await resolveOptionalKeys(
      validArgs.wipeKey,
      keyManager,
      api.keyResolver,
      'token:wipe',
    );

    const kyc = await resolveOptionalKeys(
      validArgs.kycKey,
      keyManager,
      api.keyResolver,
      'token:kyc',
    );

    const pause = await resolveOptionalKeys(
      validArgs.pauseKey,
      keyManager,
      api.keyResolver,
      'token:pause',
    );

    const feeSchedule = await resolveOptionalKeys(
      validArgs.feeScheduleKey,
      keyManager,
      api.keyResolver,
      'token:feeSchedule',
    );

    const metadata = await resolveOptionalKeys(
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
    logger.debug(`Admin Keys count: ${admin.length}`);
    logger.debug(`Supply Keys count: ${supply.length}`);
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

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
      adminKeys: admin,
      adminKeyThreshold: validArgs.adminKeyThreshold ?? admin.length,
      supplyKeys: supply,
      supplyKeyThreshold: validArgs.supplyKeyThreshold ?? supply.length,
      freezeKeys: freeze,
      freezeKeyThreshold: validArgs.freezeKeyThreshold ?? freeze.length,
      wipeKeys: wipe,
      wipeKeyThreshold: validArgs.wipeKeyThreshold ?? wipe.length,
      pauseKeys: pause,
      pauseKeyThreshold: validArgs.pauseKeyThreshold ?? pause.length,
      kycKeys: kyc,
      kycKeyThreshold: validArgs.kycKeyThreshold ?? kyc.length,
      feeScheduleKeys: feeSchedule,
      feeScheduleKeyThreshold:
        validArgs.feeScheduleKeyThreshold ?? feeSchedule.length,
      metadataKeys: metadata,
      metadataKeyThreshold: validArgs.metadataKeyThreshold ?? metadata.length,
      finalMaxSupply,
      freezeDefault: validArgs.freezeDefault,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      autoRenewAccountId: validArgs.autoRenewAccountId,
      expirationTime,
      keyRefIds: [
        treasury.keyRefId,
        ...admin.map((k) => k.keyRefId),
        ...supply.map((k) => k.keyRefId),
      ],
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
      adminKey: toHederaKey(
        normalisedParams.adminKeys,
        normalisedParams.adminKeyThreshold,
      ),
      supplyKey: toHederaKey(
        normalisedParams.supplyKeys,
        normalisedParams.supplyKeyThreshold,
      ),
      freezeKey: toHederaKey(
        normalisedParams.freezeKeys,
        normalisedParams.freezeKeyThreshold,
      ),
      wipeKey: toHederaKey(
        normalisedParams.wipeKeys,
        normalisedParams.wipeKeyThreshold,
      ),
      pauseKey: toHederaKey(
        normalisedParams.pauseKeys,
        normalisedParams.pauseKeyThreshold,
      ),
      kycKey: toHederaKey(
        normalisedParams.kycKeys,
        normalisedParams.kycKeyThreshold,
      ),
      feeScheduleKey: toHederaKey(
        normalisedParams.feeScheduleKeys,
        normalisedParams.feeScheduleKeyThreshold,
      ),
      metadataKey: toHederaKey(
        normalisedParams.metadataKeys,
        normalisedParams.metadataKeyThreshold,
      ),
      freezeDefault:
        normalisedParams.freezeKeys.length > 0
          ? normalisedParams.freezeDefault
          : undefined,
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

    for (const key of normalisedParams.adminKeys) {
      txSigners.push(key.keyRefId);
    }

    for (const key of normalisedParams.supplyKeys) {
      txSigners.push(key.keyRefId);
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
    const tokenId = result.tokenId ?? '';

    const tokenData = buildTokenData(result, {
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType,
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
      supplyKeyRefIds: normalisedParams.supplyKeys.map((k) => k.keyRefId),
      supplyKeyThreshold: normalisedParams.supplyKeyThreshold,
      freezeKeyRefIds: normalisedParams.freezeKeys.map((k) => k.keyRefId),
      freezeKeyThreshold: normalisedParams.freezeKeyThreshold,
      wipeKeyRefIds: normalisedParams.wipeKeys.map((k) => k.keyRefId),
      wipeKeyThreshold: normalisedParams.wipeKeyThreshold,
      pauseKeyRefIds: normalisedParams.pauseKeys.map((k) => k.keyRefId),
      pauseKeyThreshold: normalisedParams.pauseKeyThreshold,
      kycKeyRefIds: normalisedParams.kycKeys.map((k) => k.keyRefId),
      kycKeyThreshold: normalisedParams.kycKeyThreshold,
      feeScheduleKeyRefIds: normalisedParams.feeScheduleKeys.map(
        (k) => k.keyRefId,
      ),
      feeScheduleKeyThreshold: normalisedParams.feeScheduleKeyThreshold,
      metadataKeyRefIds: normalisedParams.metadataKeys.map((k) => k.keyRefId),
      metadataKeyThreshold: normalisedParams.metadataKeyThreshold,
      network: normalisedParams.network,
    });

    const key = composeKey(normalisedParams.network, tokenId);
    tokenState.saveToken(key, tokenData);
    logger.info('   Non-fungible token data saved to state');

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Token,
        network: normalisedParams.network,
        entityId: tokenId,
        createdAt: result.consensusTimestamp,
      });
      logger.info(`   Name registered: ${normalisedParams.alias}`);
    }

    const outputData: TokenCreateNftOutput = {
      tokenId,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      adminPublicKey: normalisedParams.adminKeys[0]?.publicKey,
      supplyPublicKey: normalisedParams.supplyKeys[0]?.publicKey,
      freezePublicKey: normalisedParams.freezeKeys[0]?.publicKey,
      wipePublicKey: normalisedParams.wipeKeys[0]?.publicKey,
      pausePublicKey: normalisedParams.pauseKeys[0]?.publicKey,
      kycPublicKey: normalisedParams.kycKeys[0]?.publicKey,
      feeSchedulePublicKey: normalisedParams.feeScheduleKeys[0]?.publicKey,
      metadataPublicKey: normalisedParams.metadataKeys[0]?.publicKey,
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
