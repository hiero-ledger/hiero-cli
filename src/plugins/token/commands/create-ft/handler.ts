import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenCreateFtInput } from './input';
import type { TokenCreateFtOutput } from './output';
import type {
  TokenCreateFtBuildTransactionResult,
  TokenCreateFtExecuteTransactionResult,
  TokenCreateFtNormalizedParams,
  TokenCreateFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { resolveOptionalKeys } from '@/plugins/token/utils/token-key-resolver';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenCreateFtInputSchema } from './input';

export const TOKEN_CREATE_FT_COMMAND_NAME = 'token_create-ft';

export class TokenCreateFtCommand extends BaseTransactionCommand<
  TokenCreateFtNormalizedParams,
  TokenCreateFtBuildTransactionResult,
  TokenCreateFtSignTransactionResult,
  TokenCreateFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CREATE_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateFtNormalizedParams> {
    const { api, logger } = args;
    const validArgs: TokenCreateFtInput = TokenCreateFtInputSchema.parse(
      args.args,
    );

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');
    const initialSupply = processTokenBalanceInput(
      validArgs.initialSupply,
      validArgs.decimals,
    );
    const maxSupply = validArgs.maxSupply
      ? processTokenBalanceInput(validArgs.maxSupply, validArgs.decimals)
      : undefined;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(validArgs.name, network);

    const {
      treasury,
      admin,
      supply,
      freeze,
      wipe,
      kyc,
      pause,
      feeSchedule,
      metadata,
    } = await this.resolveKeys(api, validArgs, keyManager);

    const autoRenewPeriodSeconds = validArgs.autoRenewPeriod;
    const autoRenewAccountCredential = validArgs.autoRenewAccount
      ? await api.keyResolver.resolveAccountCredentials(
          validArgs.autoRenewAccount,
          keyManager,
          false,
          ['token:auto-renew'],
        )
      : undefined;

    if (autoRenewPeriodSeconds && !autoRenewAccountCredential) {
      throw new ValidationError(
        'Auto-renew account is required when auto-renew period is set',
        {
          context: {
            autoRenewPeriodSeconds,
          },
        },
      );
    }

    let expirationTime: Date | undefined = validArgs.expirationTime;
    if (
      autoRenewPeriodSeconds !== undefined &&
      autoRenewAccountCredential !== undefined
    ) {
      if (expirationTime) {
        logger.warn(
          'Expiration time is ignored because auto-renew period is set; auto-renew period takes precedence over fixed expiration.',
        );
      }
      expirationTime = undefined;
    }

    let finalMaxSupply: bigint | undefined;
    if (validArgs.supplyType === SupplyType.FINITE) {
      finalMaxSupply = determineFiniteMaxSupply(maxSupply, initialSupply);
    } else if (maxSupply !== undefined) {
      logger.warn(
        'Max supply specified for INFINITE supply type - ignoring max supply parameter',
      );
    }

    logger.info(
      `Creating fungible token: ${validArgs.tokenName} (${validArgs.symbol})`,
    );
    if (finalMaxSupply !== undefined) {
      logger.info(`Max supply: ${finalMaxSupply}`);
    }

    logger.debug('=== TOKEN PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury.keyRefId}`);
    logger.debug(
      `Admin Keys (keyRefIds): ${admin.map((k) => k.keyRefId).join(', ')}`,
    );
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

    return {
      name: validArgs.tokenName,
      symbol: validArgs.symbol,
      decimals: validArgs.decimals,
      initialSupply,
      supplyType: validArgs.supplyType,
      alias: validArgs.name,
      memo: validArgs.memo,
      tokenType: HederaTokenType.FUNGIBLE_COMMON,
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
      kycKeys: kyc,
      kycKeyThreshold: validArgs.kycKeyThreshold ?? kyc.length,
      pauseKeys: pause,
      pauseKeyThreshold: validArgs.pauseKeyThreshold ?? pause.length,
      feeScheduleKeys: feeSchedule,
      feeScheduleKeyThreshold:
        validArgs.feeScheduleKeyThreshold ?? feeSchedule.length,
      metadataKeys: metadata,
      metadataKeyThreshold: validArgs.metadataKeyThreshold ?? metadata.length,
      freezeDefault: validArgs.freezeDefault,
      finalMaxSupply,
      autoRenewPeriodSeconds: autoRenewAccountCredential
        ? autoRenewPeriodSeconds
        : undefined,
      autoRenewAccountId: autoRenewAccountCredential?.accountId,
      expirationTime,
      keyRefIds: [treasury.keyRefId, ...admin.map((k) => k.keyRefId)],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateFtNormalizedParams,
  ): Promise<TokenCreateFtBuildTransactionResult> {
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
      wipeKey: toHederaKey(
        normalisedParams.wipeKeys,
        normalisedParams.wipeKeyThreshold,
      ),
      kycKey: toHederaKey(
        normalisedParams.kycKeys,
        normalisedParams.kycKeyThreshold,
      ),
      freezeKey: toHederaKey(
        normalisedParams.freezeKeys,
        normalisedParams.freezeKeyThreshold,
      ),
      pauseKey: toHederaKey(
        normalisedParams.pauseKeys,
        normalisedParams.pauseKeyThreshold,
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
      memo: normalisedParams.memo,
      autoRenewPeriodSeconds: normalisedParams.autoRenewPeriodSeconds,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      expirationTime: normalisedParams.expirationTime,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateFtNormalizedParams,
    buildTransactionResult: TokenCreateFtBuildTransactionResult,
  ): Promise<TokenCreateFtSignTransactionResult> {
    const { api } = args;
    const txSigners = [normalisedParams.treasury.keyRefId];

    for (const key of normalisedParams.adminKeys) {
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
    _normalisedParams: TokenCreateFtNormalizedParams,
    _buildTransactionResult: TokenCreateFtBuildTransactionResult,
    signTransactionResult: TokenCreateFtSignTransactionResult,
  ): Promise<TokenCreateFtExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!transactionResult.success || !transactionResult.tokenId) {
      throw new StateError(
        'Token creation completed but no token ID returned',
        {
          context: { transactionId: transactionResult.transactionId },
        },
      );
    }

    return { transactionResult };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateFtNormalizedParams,
    _buildTransactionResult: TokenCreateFtBuildTransactionResult,
    _signTransactionResult: TokenCreateFtSignTransactionResult,
    executeTransactionResult: TokenCreateFtExecuteTransactionResult,
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
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
      supplyKeyRefIds: normalisedParams.supplyKeys.map((k) => k.keyRefId),
      supplyKeyThreshold: normalisedParams.supplyKeyThreshold,
      freezeKeyRefIds: normalisedParams.freezeKeys.map((k) => k.keyRefId),
      freezeKeyThreshold: normalisedParams.freezeKeyThreshold,
      wipeKeyRefIds: normalisedParams.wipeKeys.map((k) => k.keyRefId),
      wipeKeyThreshold: normalisedParams.wipeKeyThreshold,
      kycKeyRefIds: normalisedParams.kycKeys.map((k) => k.keyRefId),
      kycKeyThreshold: normalisedParams.kycKeyThreshold,
      pauseKeyRefIds: normalisedParams.pauseKeys.map((k) => k.keyRefId),
      pauseKeyThreshold: normalisedParams.pauseKeyThreshold,
      feeScheduleKeyRefIds: normalisedParams.feeScheduleKeys.map(
        (k) => k.keyRefId,
      ),
      feeScheduleKeyThreshold: normalisedParams.feeScheduleKeyThreshold,
      metadataKeyRefIds: normalisedParams.metadataKeys.map((k) => k.keyRefId),
      metadataKeyThreshold: normalisedParams.metadataKeyThreshold,
      network: normalisedParams.network,
    });

    const tokenId = result.tokenId ?? '';
    const key = composeKey(normalisedParams.network, tokenId);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

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

    const outputData: TokenCreateFtOutput = {
      tokenId,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply.toString(),
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      alias: normalisedParams.alias,
      network: normalisedParams.network,
      autoRenewPeriodSeconds: normalisedParams.autoRenewPeriodSeconds,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      expirationTime: normalisedParams.expirationTime?.toISOString(),
    };

    return { result: outputData };
  }

  private async resolveKeys(
    api: CoreApi,
    validArgs: TokenCreateFtInput,
    keyManager: KeyManager,
  ): Promise<{
    treasury: ResolvedAccountCredential;
    admin: ResolvedPublicKey[];
    supply: ResolvedPublicKey[];
    freeze: ResolvedPublicKey[];
    wipe: ResolvedPublicKey[];
    kyc: ResolvedPublicKey[];
    pause: ResolvedPublicKey[];
    feeSchedule: ResolvedPublicKey[];
    metadata: ResolvedPublicKey[];
  }> {
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

    if (validArgs.freezeDefault && freeze.length === 0) {
      api.logger.warn(
        'freezeDefault was requested but no freeze key is set; freeze default will be skipped.',
      );
    }

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

    return {
      treasury,
      admin,
      supply,
      freeze,
      wipe,
      kyc,
      pause,
      feeSchedule,
      metadata,
    };
  }
}

export async function tokenCreateFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCreateFtCommand().execute(args);
}
