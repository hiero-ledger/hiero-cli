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
} from '@/plugins/token/utils/token-resolve-optional-key';
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

    const treasury =
      await api.keyResolver.resolveAccountCredentials(
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
      finalMaxSupply,
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
      adminAccountId: undefined,
      adminPublicKey: normalisedParams.admin?.publicKey,
      supplyAccountId: undefined,
      supplyPublicKey: normalisedParams.supply?.publicKey,
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
