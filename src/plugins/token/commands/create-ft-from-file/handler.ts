import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { CustomFee } from '@/core/types/token.types';
import type { CreateFungibleTokenFromFileOutput } from './output';
import type {
  CreateFtFromFileAssociationOutput,
  CreateFtFromFileBuildTransactionResult,
  CreateFtFromFileExecuteTransactionResult,
  CreateFtFromFileNormalizedParams,
  CreateFtFromFileSignTransactionResult,
} from './types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { CustomFeeType } from '@/core/types/token.types';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateTokenFile } from '@/plugins/token/utils/token-file-helpers';
import {
  resolveOptionalKey,
  toPublicKey,
} from '@/plugins/token/utils/token-resolve-optional-key';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFungibleTokenFromFileInputSchema } from './input';

export const TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME =
  'token_create-ft-from-file';

export class CreateFtFromFileCommand extends BaseTransactionCommand<
  CreateFtFromFileNormalizedParams,
  CreateFtFromFileBuildTransactionResult,
  CreateFtFromFileSignTransactionResult,
  CreateFtFromFileExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateFtFromFileNormalizedParams> {
    const { api, logger } = args;
    const validArgs = CreateFungibleTokenFromFileInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManagerName>('default_key_manager');

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
      ['token:treasury'],
    );
    const adminKey = await api.keyResolver.resolveSigningKey(
      tokenDefinition.adminKey,
      keyManager,
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
      tokenDefinition,
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
    normalisedParams: CreateFtFromFileNormalizedParams,
  ): Promise<CreateFtFromFileBuildTransactionResult> {
    const { api } = args;
    const { tokenDefinition } = normalisedParams;
    const transaction = api.token.createTokenTransaction({
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: tokenDefinition.decimals,
      initialSupplyRaw: tokenDefinition.initialSupply,
      tokenType: tokenDefinition.tokenType,
      supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
      maxSupplyRaw: tokenDefinition.maxSupply,
      adminPublicKey: PublicKey.fromString(normalisedParams.adminKey.publicKey),
      supplyPublicKey: toPublicKey(normalisedParams.supplyKey),
      wipePublicKey: toPublicKey(normalisedParams.wipeKey),
      kycPublicKey: toPublicKey(normalisedParams.kycKey),
      freezePublicKey: toPublicKey(normalisedParams.freezeKey),
      pausePublicKey: toPublicKey(normalisedParams.pauseKey),
      feeSchedulePublicKey: toPublicKey(normalisedParams.feeScheduleKey),
      customFees: tokenDefinition.customFees.map((fee): CustomFee => {
        if (fee.type === CustomFeeType.FIXED) {
          return {
            type: CustomFeeType.FIXED,
            amount: fee.amount,
            unitType: fee.unitType,
            collectorId: fee.collectorId,
            exempt: fee.exempt,
          };
        }
        return {
          type: CustomFeeType.FRACTIONAL,
          numerator: fee.numerator,
          denominator: fee.denominator,
          min: fee.min,
          max: fee.max,
          netOfTransfers: fee.netOfTransfers,
          collectorId: fee.collectorId,
          exempt: fee.exempt,
        };
      }),
      memo: tokenDefinition.memo,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateFtFromFileNormalizedParams,
    buildTransactionResult: CreateFtFromFileBuildTransactionResult,
  ): Promise<CreateFtFromFileSignTransactionResult> {
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
    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: CreateFtFromFileNormalizedParams,
    _buildTransactionResult: CreateFtFromFileBuildTransactionResult,
    signTransactionResult: CreateFtFromFileSignTransactionResult,
  ): Promise<CreateFtFromFileExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.transaction,
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
    normalisedParams: CreateFtFromFileNormalizedParams,
    _buildTransactionResult: CreateFtFromFileBuildTransactionResult,
    _signTransactionResult: CreateFtFromFileSignTransactionResult,
    executeTransactionResult: CreateFtFromFileExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildTokenDataFromFile(
      result,
      normalisedParams.tokenDefinition,
      normalisedParams.treasury.accountId,
      normalisedParams.adminKey.publicKey,
      normalisedParams.network,
      {
        supplyPublicKey: normalisedParams.supplyKey?.publicKey,
        wipePublicKey: normalisedParams.wipeKey?.publicKey,
        kycPublicKey: normalisedParams.kycKey?.publicKey,
        freezePublicKey: normalisedParams.freezeKey?.publicKey,
        pausePublicKey: normalisedParams.pauseKey?.publicKey,
        feeSchedulePublicKey: normalisedParams.feeScheduleKey?.publicKey,
      },
    );

    const successfulAssociations = await processTokenAssociations(
      result.tokenId!,
      normalisedParams.tokenDefinition.associations,
      api,
      logger,
      normalisedParams.keyManager,
    );
    tokenData.associations = successfulAssociations;

    const key = composeKey(normalisedParams.network, result.tokenId!);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

    api.alias.register({
      alias: normalisedParams.tokenDefinition.name,
      type: AliasType.Token,
      network: normalisedParams.network,
      entityId: result.tokenId!,
      createdAt: result.consensusTimestamp,
    });
    logger.info(`   Name registered: ${normalisedParams.tokenDefinition.name}`);

    const associations: CreateFtFromFileAssociationOutput[] =
      successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId,
      }));

    const outputData: CreateFungibleTokenFromFileOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.tokenDefinition.name,
      symbol: normalisedParams.tokenDefinition.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.tokenDefinition.decimals,
      initialSupply: normalisedParams.tokenDefinition.initialSupply.toString(),
      supplyType:
        normalisedParams.tokenDefinition.supplyType.toUpperCase() as SupplyType,
      transactionId: result.transactionId,
      network: normalisedParams.network,
      associations,
    };

    return { result: outputData };
  }
}

export const createFtFromFile = (args: CommandHandlerArgs) =>
  new CreateFtFromFileCommand().execute(args);

export const createTokenFromFile = createFtFromFile;
