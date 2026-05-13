import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { TokenAliasService } from '@/plugins/token/services/token-alias.service.interface';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type { TokenFileService } from '@/plugins/token/services/token-file.service.interface';
import type { TokenKeysService } from '@/plugins/token/services/token-keys.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
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
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { TokenAliasServiceImpl } from '@/plugins/token/services/token-alias.service';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenFileServiceImpl } from '@/plugins/token/services/token-file.service';
import { TokenKeysServiceImpl } from '@/plugins/token/services/token-keys.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildNftTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';

import { TokenCreateNftFromFileInputSchema } from './input';

export const TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME =
  'token_create-nft-from-file';

export class TokenCreateNftFromFileCommand extends BaseTransactionCommand<
  TokenCreateNftFromFileNormalizedParams,
  TokenCreateNftFromFileBuildTransactionResult,
  TokenCreateNftFromFileSignTransactionResult,
  TokenCreateNftFromFileExecuteTransactionResult
> {
  constructor(
    private readonly tokenStateService: TokenStateService,
    private readonly tokenAliasService: TokenAliasService,
    private readonly tokenFileService: TokenFileService,
    private readonly tokenAssociationsService: TokenAssociationsService,
    private readonly tokenKeysService: TokenKeysService,
  ) {
    super(TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenCreateNftFromFileNormalizedParams> {
    const { api } = args;
    const validArgs = TokenCreateNftFromFileInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    api.logger.info(`Creating NFT token from file: ${validArgs.file}`);
    const tokenDefinition =
      await this.tokenFileService.readAndValidateNftTokenFile(validArgs.file);
    const network = api.network.getCurrentNetwork();
    this.tokenAliasService.availableOrThrow(tokenDefinition.name, network);

    const treasury = await api.keyResolver.resolveAccountCredentials(
      tokenDefinition.treasuryKey,
      keyManager,
      false,
      ['token:treasury'],
    );

    const adminKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.adminKey,
      keyManager,
      'token:admin',
    );
    api.logger.info(`Resolved ${adminKeys.length} admin key(s) for signing`);

    const supplyKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.supplyKey,
      keyManager,
      'token:supply',
    );
    api.logger.info(`Resolved ${supplyKeys.length} supply key(s)`);

    const wipeKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.wipeKey,
      keyManager,
      'token:wipe',
    );

    const kycKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.kycKey,
      keyManager,
      'token:kyc',
    );

    const freezeKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.freezeKey,
      keyManager,
      'token:freeze',
    );

    const pauseKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.pauseKey,
      keyManager,
      'token:pause',
    );

    const feeScheduleKeys = await this.tokenKeysService.resolveOptionalKeys(
      tokenDefinition.feeScheduleKey,
      keyManager,
      'token:feeSchedule',
    );

    const keyRefIds = [...adminKeys.map((k) => k.keyRefId), treasury.keyRefId];

    return {
      filename: validArgs.file,
      keyManager,
      alias: tokenDefinition.name,
      name: tokenDefinition.tokenName,
      symbol: tokenDefinition.symbol,
      supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
      maxSupply: tokenDefinition.maxSupply,
      memo: tokenDefinition.memo,
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
    const { api } = args;
    const signingKeys = [
      ...normalisedParams.adminKeys.map((k) => k.keyRefId),
      normalisedParams.treasury.keyRefId,
    ];
    api.logger.info(
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
    const { api } = args;
    const result = executeTransactionResult.transactionResult;
    const tokenData = buildNftTokenDataFromFile(result, normalisedParams);

    const tokenId = result.tokenId ?? '';
    const successfulAssociations =
      await this.tokenAssociationsService.processTokenAssociations(
        tokenId,
        normalisedParams.associations,
        normalisedParams.keyManager,
      );
    tokenData.associations = successfulAssociations;

    const key = composeKey(normalisedParams.network, tokenId);
    this.tokenStateService.saveToken(key, tokenData);
    api.logger.info('   Token data saved to state');

    if (normalisedParams.alias && result.tokenId) {
      this.tokenAliasService.register({
        alias: normalisedParams.alias,
        network: normalisedParams.network,
        tokenId,
        createdAt: result.consensusTimestamp,
      });
      api.logger.info(`   Name registered: ${normalisedParams.alias}`);
    }

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
  const { api } = args;
  const tokenStateService = new TokenStateServiceImpl(api.state, api.logger);
  return new TokenCreateNftFromFileCommand(
    tokenStateService,
    new TokenAliasServiceImpl(api.alias),
    new TokenFileServiceImpl(api.logger),
    new TokenAssociationsServiceImpl(
      api.keyResolver,
      api.token,
      api.txSign,
      api.txExecute,
      tokenStateService,
      api.logger,
    ),
    new TokenKeysServiceImpl(api.keyResolver),
  ).execute(args);
}
