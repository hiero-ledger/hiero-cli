import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { TokenCreateFtFromFileOutput } from './output';
import type {
  TokenCreateFtFromFileAssociationOutput,
  TokenCreateFtFromFileBuildTransactionResult,
  TokenCreateFtFromFileExecuteTransactionResult,
  TokenCreateFtFromFileNormalizedParams,
  TokenCreateFtFromFileSignTransactionResult,
} from './types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateTokenFile } from '@/plugins/token/utils/token-file-helpers';
import {
  resolveOptionalKey,
  toPublicKey,
} from '@/plugins/token/utils/token-resolve-optional-key';
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

    const treasury = await api.keyResolver.resolveAccountCredentials(
      tokenDefinition.treasuryKey,
      keyManager,
      false,
      ['token:treasury'],
    );
    const adminKey = await api.keyResolver.resolveSigningKey(
      tokenDefinition.adminKey,
      keyManager,
      false,
      ['token:admin', `token:${tokenDefinition.name}`],
    );
    logger.info('🔑 Resolved admin key for signing');

    const supplyKey = await resolveOptionalKey(
      tokenDefinition.supplyKey,
      keyManager,
      api.keyResolver,
      'token:supply',
    );
    const wipeKey = await resolveOptionalKey(
      tokenDefinition.wipeKey,
      keyManager,
      api.keyResolver,
      'token:wipe',
    );
    const kycKey = await resolveOptionalKey(
      tokenDefinition.kycKey,
      keyManager,
      api.keyResolver,
      'token:kyc',
    );
    const freezeKey = await resolveOptionalKey(
      tokenDefinition.freezeKey,
      keyManager,
      api.keyResolver,
      'token:freeze',
    );
    const pauseKey = await resolveOptionalKey(
      tokenDefinition.pauseKey,
      keyManager,
      api.keyResolver,
      'token:pause',
    );
    const feeScheduleKey = await resolveOptionalKey(
      tokenDefinition.feeScheduleKey,
      keyManager,
      api.keyResolver,
      'token:feeSchedule',
    );

    return {
      filename: validArgs.file,
      keyManager,
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
      adminKey,
      supplyKey,
      wipeKey,
      kycKey,
      freezeKey,
      pauseKey,
      feeScheduleKey,
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
      adminPublicKey: PublicKey.fromString(normalisedParams.adminKey.publicKey),
      supplyPublicKey: toPublicKey(normalisedParams.supplyKey),
      wipePublicKey: toPublicKey(normalisedParams.wipeKey),
      kycPublicKey: toPublicKey(normalisedParams.kycKey),
      freezePublicKey: toPublicKey(normalisedParams.freezeKey),
      pausePublicKey: toPublicKey(normalisedParams.pauseKey),
      feeSchedulePublicKey: toPublicKey(normalisedParams.feeScheduleKey),
      customFees: normalisedParams.customFees,
      memo: normalisedParams.memo,
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
      normalisedParams.adminKey.keyRefId,
      normalisedParams.treasury.keyRefId,
    ];
    logger.info(
      `🔑 Signing transaction with admin key and treasury key (${signingKeys.length} keys)`,
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

    const successfulAssociations = await processTokenAssociations(
      result.tokenId!,
      normalisedParams.associations,
      api,
      logger,
      normalisedParams.keyManager,
    );
    tokenData.associations = successfulAssociations;

    const key = composeKey(normalisedParams.network, result.tokenId!);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

    api.alias.register({
      alias: normalisedParams.name,
      type: AliasType.Token,
      network: normalisedParams.network,
      entityId: result.tokenId!,
      createdAt: result.consensusTimestamp,
    });
    logger.info(`   Name registered: ${normalisedParams.name}`);

    const associations: TokenCreateFtFromFileAssociationOutput[] =
      successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId,
      }));

    const outputData: TokenCreateFtFromFileOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply.toString(),
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      network: normalisedParams.network,
      associations,
    };

    return { result: outputData };
  }
}

export async function tokenCreateFtFromFile(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCreateFtFromFileCommand().execute(args);
}
