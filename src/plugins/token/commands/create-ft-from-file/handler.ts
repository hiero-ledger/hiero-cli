import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { FungibleTokenFileDefinition } from '@/plugins/token/schema';
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
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateTokenFile } from '@/plugins/token/utils/token-file-helpers';
import { resolveOptionalKey } from '@/plugins/token/utils/token-key-resolver';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenCreateFtFromFileInputSchema } from './input';

export const TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME =
  'token_create-ft-from-file';

export class TokenCreateFtFromFileCommand extends BaseTransactionCommand<
  TokenCreateFtFromFileNormalizedParams,
  TokenCreateFtFromFileBuildTransactionResult,
  TokenCreateFtFromFileSignTransactionResult,
  TokenCreateFtFromFileExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateFtFromFileNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenCreateFtFromFileInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');

    logger.info(`Creating fungible token from file: ${validArgs.file}`);

    const tokenDefinition = await readAndValidateTokenFile(
      validArgs.file,
      logger,
    );
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
    } = await this.resolveKeys(api, tokenDefinition, keyManager);

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
        logger.warn(
          'expirationTime is ignored because autoRenewPeriod is set; auto-renew period takes precedence over fixed expiration.',
        );
      }
      expirationTime = undefined;
    }

    return {
      filename: validArgs.file,
      keyManager,
      alias: tokenDefinition.name,
      name: tokenDefinition.name,
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
      adminKeyThreshold: adminKeys.length,
      supplyKeys,
      supplyKeyThreshold: supplyKeys.length,
      wipeKeys,
      wipeKeyThreshold: wipeKeys.length,
      kycKeys,
      kycKeyThreshold: kycKeys.length,
      freezeKeys,
      freezeKeyThreshold: freezeKeys.length,
      pauseKeys,
      pauseKeyThreshold: pauseKeys.length,
      feeScheduleKeys,
      feeScheduleKeyThreshold: feeScheduleKeys.length,
      metadataKeys,
      metadataKeyThreshold: metadataKeys.length,
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
    const { api, logger } = args;
    const signingKeys = [
      normalisedParams.treasury.keyRefId,
      ...normalisedParams.adminKeys.map((k) => k.keyRefId),
    ];
    logger.info(
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
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildTokenDataFromFile(result, normalisedParams);

    const tokenId = result.tokenId ?? '';
    const successfulAssociations = await processTokenAssociations(
      tokenId,
      normalisedParams.associations,
      api,
      logger,
      normalisedParams.keyManager,
    );
    tokenData.associations = successfulAssociations;

    const key = composeKey(normalisedParams.network, tokenId);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

    if (normalisedParams.alias && result.tokenId) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Token,
        network: normalisedParams.network,
        entityId: tokenId,
        createdAt: result.consensusTimestamp,
      });
      logger.info(`   Name registered: ${normalisedParams.alias}`);
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

  private async resolveKeys(
    api: CoreApi,
    tokenDefinition: FungibleTokenFileDefinition,
    keyManager: KeyManager,
  ): Promise<{
    treasury: ResolvedAccountCredential;
    adminKeys: ResolvedPublicKey[];
    supplyKeys: ResolvedPublicKey[];
    wipeKeys: ResolvedPublicKey[];
    kycKeys: ResolvedPublicKey[];
    freezeKeys: ResolvedPublicKey[];
    pauseKeys: ResolvedPublicKey[];
    feeScheduleKeys: ResolvedPublicKey[];
    metadataKeys: ResolvedPublicKey[];
    keyRefIds: string[];
  }> {
    const treasury = await api.keyResolver.resolveAccountCredentials(
      tokenDefinition.treasuryKey,
      keyManager,
      false,
      ['token:treasury'],
    );
    const keyRefIds: string[] = [treasury.keyRefId];

    const adminResolved = await resolveOptionalKey(
      tokenDefinition.adminKey,
      keyManager,
      api.keyResolver,
      'token:admin',
    );
    const adminKeys = adminResolved ? [adminResolved] : [];
    if (adminKeys.length > 0) {
      keyRefIds.push(...adminKeys.map((k) => k.keyRefId));
      api.logger.info('🔑 Resolved admin key for signing');
    }

    const supplyResolved = await resolveOptionalKey(
      tokenDefinition.supplyKey,
      keyManager,
      api.keyResolver,
      'token:supply',
    );
    const supplyKeys = supplyResolved ? [supplyResolved] : [];

    const wipeResolved = await resolveOptionalKey(
      tokenDefinition.wipeKey,
      keyManager,
      api.keyResolver,
      'token:wipe',
    );
    const wipeKeys = wipeResolved ? [wipeResolved] : [];

    const kycResolved = await resolveOptionalKey(
      tokenDefinition.kycKey,
      keyManager,
      api.keyResolver,
      'token:kyc',
    );
    const kycKeys = kycResolved ? [kycResolved] : [];

    const freezeResolved = await resolveOptionalKey(
      tokenDefinition.freezeKey,
      keyManager,
      api.keyResolver,
      'token:freeze',
    );
    const freezeKeys = freezeResolved ? [freezeResolved] : [];
    if (tokenDefinition.freezeDefault && freezeKeys.length === 0) {
      api.logger.warn(
        'freezeDefault was requested but no freeze key is set; freeze default will be skipped.',
      );
    }

    const pauseResolved = await resolveOptionalKey(
      tokenDefinition.pauseKey,
      keyManager,
      api.keyResolver,
      'token:pause',
    );
    const pauseKeys = pauseResolved ? [pauseResolved] : [];

    const feeScheduleResolved = await resolveOptionalKey(
      tokenDefinition.feeScheduleKey,
      keyManager,
      api.keyResolver,
      'token:feeSchedule',
    );
    const feeScheduleKeys = feeScheduleResolved ? [feeScheduleResolved] : [];

    const metadataResolved = await resolveOptionalKey(
      tokenDefinition.metadataKey,
      keyManager,
      api.keyResolver,
      'token:metadata',
    );
    const metadataKeys = metadataResolved ? [metadataResolved] : [];

    return {
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
    };
  }
}

export async function tokenCreateFtFromFile(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCreateFtFromFileCommand().execute(args);
}
