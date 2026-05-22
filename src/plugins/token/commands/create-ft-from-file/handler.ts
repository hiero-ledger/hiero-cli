import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type { TokenFileService } from '@/plugins/token/services/token-file.service.interface';
import type { TokenKeysService } from '@/plugins/token/services/token-keys.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
import type { TokenCreateFtFromFileOutput } from './output';
import type {
  TokenCreateFtFromFileAssociationOutput,
  TokenCreateFtFromFileBuildTransactionResult,
  TokenCreateFtFromFileExecuteTransactionResult,
  TokenCreateFtFromFileNormalizedParams,
  TokenCreateFtFromFileSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError, ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenFileServiceImpl } from '@/plugins/token/services/token-file.service';
import { TokenKeysServiceImpl } from '@/plugins/token/services/token-keys.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';

import { TokenCreateFtFromFileInputSchema } from './input';

export const TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME =
  'token_create-ft-from-file';

export class TokenCreateFtFromFileCommand extends BaseTransactionCommand<
  TokenCreateFtFromFileNormalizedParams,
  TokenCreateFtFromFileBuildTransactionResult,
  TokenCreateFtFromFileSignTransactionResult,
  TokenCreateFtFromFileExecuteTransactionResult
> {
  constructor(
    private readonly tokenStateService: TokenStateService,
    private readonly tokenFileService: TokenFileService,
    private readonly tokenAssociationsService: TokenAssociationsService,
    private readonly tokenKeysService: TokenKeysService,
  ) {
    super(TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateFtFromFileNormalizedParams> {
    const { api } = args;
    const validArgs = TokenCreateFtFromFileInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    api.logger.info(`Creating fungible token from file: ${validArgs.file}`);

    const tokenDefinition =
      await this.tokenFileService.readAndValidateFtTokenFile(validArgs.file);
    const network = api.network.getCurrentNetwork();
    api.alias.availableOrThrow(tokenDefinition.name, network);

    const {
      treasury,
      adminKeys,
      supplyKeys,
      wipeKeys,
      kycKeys,
      freezeKeys,
      pauseKeys,
      feeScheduleKeys,
      metadataKeys,
      keyRefIds,
    } = await this.tokenKeysService.resolveCreateFtFromFileKeys(
      tokenDefinition,
      keyManager,
    );
    if (adminKeys.length > 0) {
      api.logger.info('🔑 Resolved admin key for signing');
    }
    if (tokenDefinition.freezeDefault && freezeKeys.length === 0) {
      api.logger.warn(
        'freezeDefault was requested but no freeze key is set; freeze default will be skipped.',
      );
    }

    const autoRenewPeriodSeconds = tokenDefinition.autoRenewPeriod;
    const autoRenewAccountCredential = tokenDefinition.autoRenewAccount
      ? await api.keyResolver.resolveAccountCredentials(
          tokenDefinition.autoRenewAccount,
          keyManager,
          false,
          ['token:auto-renew'],
        )
      : undefined;

    if (autoRenewPeriodSeconds !== undefined && !autoRenewAccountCredential) {
      throw new ValidationError(
        'autoRenewAccount is required when autoRenewPeriod is set',
        {
          context: {
            autoRenewPeriodSeconds,
          },
        },
      );
    }

    let expirationTime: Date | undefined = tokenDefinition.expirationTime;
    if (
      autoRenewPeriodSeconds !== undefined &&
      autoRenewAccountCredential !== undefined
    ) {
      if (expirationTime !== undefined) {
        api.logger.warn(
          'expirationTime is ignored because autoRenewPeriod is set; auto-renew period takes precedence over fixed expiration.',
        );
      }
      expirationTime = undefined;
    }

    return {
      filename: validArgs.file,
      keyManager,
      alias: tokenDefinition.name,
      name: tokenDefinition.tokenName,
      symbol: tokenDefinition.symbol,
      decimals: tokenDefinition.decimals,
      initialSupply: tokenDefinition.initialSupply,
      maxSupply: tokenDefinition.maxSupply,
      supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
      memo: tokenDefinition.memo,
      tokenType: tokenDefinition.tokenType,
      customFees: tokenDefinition.customFees,
      associations: tokenDefinition.associations,
      network,
      treasury,
      adminKeys,
      adminKeyThreshold: tokenDefinition.adminKeyThreshold ?? adminKeys.length,
      supplyKeys,
      supplyKeyThreshold:
        tokenDefinition.supplyKeyThreshold ?? supplyKeys.length,
      wipeKeys,
      wipeKeyThreshold: tokenDefinition.wipeKeyThreshold ?? wipeKeys.length,
      kycKeys,
      kycKeyThreshold: tokenDefinition.kycKeyThreshold ?? kycKeys.length,
      freezeKeys,
      freezeKeyThreshold:
        tokenDefinition.freezeKeyThreshold ?? freezeKeys.length,
      pauseKeys,
      pauseKeyThreshold: tokenDefinition.pauseKeyThreshold ?? pauseKeys.length,
      feeScheduleKeys,
      feeScheduleKeyThreshold:
        tokenDefinition.feeScheduleKeyThreshold ?? feeScheduleKeys.length,
      metadataKeys,
      metadataKeyThreshold:
        tokenDefinition.metadataKeyThreshold ?? metadataKeys.length,
      keyRefIds,
      freezeDefault: tokenDefinition.freezeDefault,
      autoRenewPeriodSeconds: autoRenewAccountCredential
        ? autoRenewPeriodSeconds
        : undefined,
      autoRenewAccountId: autoRenewAccountCredential?.accountId,
      expirationTime,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateFtFromFileNormalizedParams,
  ): Promise<TokenCreateFtFromFileBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createTokenTransaction({
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupplyRaw: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType.toUpperCase() as SupplyType,
      maxSupplyRaw: normalisedParams.maxSupply,
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
      customFees: normalisedParams.customFees,
      memo: normalisedParams.memo,
      autoRenewPeriodSeconds: normalisedParams.autoRenewPeriodSeconds,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      expirationTime: normalisedParams.expirationTime,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateFtFromFileNormalizedParams,
    buildTransactionResult: TokenCreateFtFromFileBuildTransactionResult,
  ): Promise<TokenCreateFtFromFileSignTransactionResult> {
    const { api } = args;
    const signingKeys = [
      normalisedParams.treasury.keyRefId,
      ...normalisedParams.adminKeys.map((k) => k.keyRefId),
    ];
    api.logger.info(
      `🔑 Signing token create with treasury${normalisedParams.adminKeys.length > 0 ? ' and admin' : ''} (${signingKeys.length} key(s))`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      signingKeys,
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: TokenCreateFtFromFileNormalizedParams,
    _buildTransactionResult: TokenCreateFtFromFileBuildTransactionResult,
    signTransactionResult: TokenCreateFtFromFileSignTransactionResult,
  ): Promise<TokenCreateFtFromFileExecuteTransactionResult> {
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
    normalisedParams: TokenCreateFtFromFileNormalizedParams,
    _buildTransactionResult: TokenCreateFtFromFileBuildTransactionResult,
    _signTransactionResult: TokenCreateFtFromFileSignTransactionResult,
    executeTransactionResult: TokenCreateFtFromFileExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api } = args;
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildTokenDataFromFile(result, normalisedParams);

    const tokenId = result.tokenId ?? '';
    const successfulAssociations =
      await this.tokenAssociationsService.processTokenAssociations(
        tokenId,
        normalisedParams.associations,
        normalisedParams.keyManager,
      );
    const key = composeKey(normalisedParams.network, tokenId);
    this.tokenStateService.saveToken(key, tokenData);
    api.logger.info('   Token data saved to state');

    if (normalisedParams.alias && result.tokenId) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Token,
        network: normalisedParams.network,
        entityId: tokenId,
        createdAt: result.consensusTimestamp,
      });
      api.logger.info(`   Name registered: ${normalisedParams.alias}`);
    }

    const associations: TokenCreateFtFromFileAssociationOutput[] =
      successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId,
      }));

    const outputData: TokenCreateFtFromFileOutput = {
      tokenId,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply.toString(),
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      network: normalisedParams.network,
      associations,
      autoRenewPeriodSeconds: normalisedParams.autoRenewPeriodSeconds,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      expirationTime: normalisedParams.expirationTime?.toISOString(),
    };

    return { result: outputData };
  }
}

export async function tokenCreateFtFromFile(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const tokenStateService = new TokenStateServiceImpl(api.state, api.logger);
  return new TokenCreateFtFromFileCommand(
    tokenStateService,
    new TokenFileServiceImpl(api.logger),
    new TokenAssociationsServiceImpl(
      api.keyResolver,
      api.token,
      api.txSign,
      api.txExecute,
      api.logger,
    ),
    new TokenKeysServiceImpl(api.keyResolver),
  ).execute(args);
}
