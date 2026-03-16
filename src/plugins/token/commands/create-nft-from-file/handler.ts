import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { TokenCreateNftFromFileOutput } from './output';
import type {
  TokenCreateNftFromFileAssociationOutput,
  TokenCreateNftFromFileBuildTransactionResult,
  TokenCreateNftFromFileExecuteTransactionResult,
  TokenCreateNftFromFileNormalizedParams,
  TokenCreateNftFromFileSignTransactionResult,
} from './types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildNftTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateNftTokenFile } from '@/plugins/token/utils/token-file-helpers';
import {
  resolveOptionalKey,
  toPublicKey,
} from '@/plugins/token/utils/token-resolve-optional-key';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenCreateNftFromFileInputSchema } from './input';

export const TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME =
  'token_create-nft-from-file';

export class TokenCreateNftFromFileCommand extends BaseTransactionCommand<
  TokenCreateNftFromFileNormalizedParams,
  TokenCreateNftFromFileBuildTransactionResult,
  TokenCreateNftFromFileSignTransactionResult,
  TokenCreateNftFromFileExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateNftFromFileNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenCreateNftFromFileInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');

    logger.info(`Creating NFT token from file: ${validArgs.file}`);

    const tokenDefinition = await readAndValidateNftTokenFile(
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
    const supplyKey = await api.keyResolver.resolveSigningKey(
      tokenDefinition.supplyKey,
      keyManager,
      false,
      ['token:supply'],
    );
    logger.info('🔑 Resolved supply key for signing');

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
    normalisedParams: TokenCreateNftFromFileNormalizedParams,
  ): Promise<TokenCreateNftFromFileBuildTransactionResult> {
    const { api } = args;
    const { tokenDefinition } = normalisedParams;
    const transaction = api.token.createTokenTransaction({
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: 0,
      initialSupplyRaw: 0n,
      tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
      supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
      maxSupplyRaw: tokenDefinition.maxSupply ?? 0n,
      adminPublicKey: PublicKey.fromString(normalisedParams.adminKey.publicKey),
      supplyPublicKey: PublicKey.fromString(
        normalisedParams.supplyKey.publicKey,
      ),
      wipePublicKey: toPublicKey(normalisedParams.wipeKey),
      kycPublicKey: toPublicKey(normalisedParams.kycKey),
      freezePublicKey: toPublicKey(normalisedParams.freezeKey),
      pausePublicKey: toPublicKey(normalisedParams.pauseKey),
      feeSchedulePublicKey: toPublicKey(normalisedParams.feeScheduleKey),
      memo: tokenDefinition.memo,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateNftFromFileNormalizedParams,
    buildTransactionResult: TokenCreateNftFromFileBuildTransactionResult,
  ): Promise<TokenCreateNftFromFileSignTransactionResult> {
    const { api, logger } = args;
    const signingKeys = [
      normalisedParams.adminKey.keyRefId,
      normalisedParams.treasury.keyRefId,
      normalisedParams.supplyKey.keyRefId,
    ];
    logger.info(
      `🔑 Signing transaction with admin, treasury and supply keys (${signingKeys.length} keys)`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      signingKeys,
    );
    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: TokenCreateNftFromFileNormalizedParams,
    _buildTransactionResult: TokenCreateNftFromFileBuildTransactionResult,
    signTransactionResult: TokenCreateNftFromFileSignTransactionResult,
  ): Promise<TokenCreateNftFromFileExecuteTransactionResult> {
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
    normalisedParams: TokenCreateNftFromFileNormalizedParams,
    _buildTransactionResult: TokenCreateNftFromFileBuildTransactionResult,
    _signTransactionResult: TokenCreateNftFromFileSignTransactionResult,
    executeTransactionResult: TokenCreateNftFromFileExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildNftTokenDataFromFile(
      result,
      normalisedParams.tokenDefinition,
      normalisedParams.treasury.accountId,
      normalisedParams.adminKey.publicKey,
      normalisedParams.supplyKey.publicKey,
      normalisedParams.network,
      {
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

    const associations: TokenCreateNftFromFileAssociationOutput[] =
      successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId,
      }));

    const outputData: TokenCreateNftFromFileOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.tokenDefinition.name,
      symbol: normalisedParams.tokenDefinition.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      adminPublicKey: normalisedParams.adminKey.publicKey,
      supplyPublicKey: normalisedParams.supplyKey.publicKey,
      supplyType:
        normalisedParams.tokenDefinition.supplyType.toUpperCase() as SupplyType,
      transactionId: result.transactionId,
      network: normalisedParams.network,
      associations,
    };

    return { result: outputData };
  }
}

export async function tokenCreateNftFromFile(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCreateNftFromFileCommand().execute(args);
}
