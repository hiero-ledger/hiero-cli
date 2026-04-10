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

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildNftTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateNftTokenFile } from '@/plugins/token/utils/token-file-helpers';
import { resolveOptionalKey } from '@/plugins/token/utils/token-key-resolver';
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

    const adminResolved = await api.keyResolver.resolveSigningKey(
      tokenDefinition.adminKey,
      keyManager,
      false,
      ['token:admin', `token:${tokenDefinition.name}`],
    );
    const adminKeys = [adminResolved];
    logger.info('Resolved admin key for signing');

    const supplyResolved = await api.keyResolver.getPublicKey(
      tokenDefinition.supplyKey,
      keyManager,
      false,
      ['token:supply'],
    );
    const supplyKeys = [supplyResolved];
    logger.info('Resolved supply key');

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

    const keyRefIds = [...adminKeys.map((k) => k.keyRefId), treasury.keyRefId];

    return {
      filename: validArgs.file,
      keyManager,
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
      maxSupply: tokenDefinition.maxSupply,
      memo: tokenDefinition.memo,
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
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenCreateNftFromFileNormalizedParams,
  ): Promise<TokenCreateNftFromFileBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createTokenTransaction({
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: 0,
      initialSupplyRaw: 0n,
      tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
      supplyType: normalisedParams.supplyType,
      maxSupplyRaw: normalisedParams.maxSupply ?? 0n,
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
      memo: normalisedParams.memo,
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
      ...normalisedParams.adminKeys.map((k) => k.keyRefId),
      normalisedParams.treasury.keyRefId,
    ];
    logger.info(
      `🔑 Signing transaction with admin and treasury keys (${signingKeys.length} keys)`,
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
    const tokenData = buildNftTokenDataFromFile(result, normalisedParams);

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

    api.alias.register({
      alias: normalisedParams.name,
      type: AliasType.Token,
      network: normalisedParams.network,
      entityId: tokenId,
      createdAt: result.consensusTimestamp,
    });
    logger.info(`   Name registered: ${normalisedParams.name}`);

    const associations: TokenCreateNftFromFileAssociationOutput[] =
      successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId,
      }));

    const outputData: TokenCreateNftFromFileOutput = {
      tokenId,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      adminPublicKey: normalisedParams.adminKeys[0]?.publicKey ?? '',
      supplyPublicKey: normalisedParams.supplyKeys[0]?.publicKey ?? '',
      supplyType: normalisedParams.supplyType,
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
