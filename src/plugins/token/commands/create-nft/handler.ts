import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateNftOutput } from '@/plugins/token/commands/create-nft/output';
import type {
  CreateNftBuildTransactionResult,
  CreateNftExecuteTransactionResult,
  CreateNftNormalizedParams,
  CreateNftSignTransactionResult,
} from '@/plugins/token/commands/create-nft/types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { CreateNftInputSchema } from '@/plugins/token/commands/create-nft/input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

export class CreateNftCommand extends BaseTransactionCommand<
  CreateNftNormalizedParams,
  CreateNftBuildTransactionResult,
  CreateNftSignTransactionResult,
  CreateNftExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = CreateNftInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManagerName>('default_key_manager');
    const maxSupply = validArgs.maxSupply
      ? processTokenBalanceInput(validArgs.maxSupply, 0)
      : undefined;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(validArgs.name, network);

    const treasury =
      await api.keyResolver.resolveAccountCredentialsWithFallback(
        validArgs.treasury,
        keyManager,
        ['token:treasury'],
      );
    const admin = await api.keyResolver.resolveAccountCredentialsWithFallback(
      validArgs.adminKey,
      keyManager,
      ['token:admin'],
    );
    const supply = await api.keyResolver.resolveAccountCredentialsWithFallback(
      validArgs.supplyKey,
      keyManager,
      ['token:supply'],
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
    logger.debug(`Admin Key (keyRefId): ${admin.keyRefId}`);
    logger.debug(`Supply Key (keyRefId): ${supply.keyRefId}`);
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
      adminKeyProvided: Boolean(validArgs.adminKey),
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateNftNormalizedParams,
  ): Promise<CreateNftBuildTransactionResult> {
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
      adminPublicKey: PublicKey.fromString(normalisedParams.admin.publicKey),
      supplyPublicKey: PublicKey.fromString(normalisedParams.supply.publicKey),
      memo: normalisedParams.memo,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateNftNormalizedParams,
    buildTransactionResult: CreateNftBuildTransactionResult,
  ): Promise<CreateNftSignTransactionResult> {
    const { api } = args;
    const txSigners = [normalisedParams.treasury.keyRefId];

    if (normalisedParams.adminKeyProvided) {
      txSigners.push(normalisedParams.admin.keyRefId);
    }

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      txSigners,
    );
    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: CreateNftNormalizedParams,
    _buildTransactionResult: CreateNftBuildTransactionResult,
    signTransactionResult: CreateNftSignTransactionResult,
  ): Promise<CreateNftExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.transaction,
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
    normalisedParams: CreateNftNormalizedParams,
    _buildTransactionResult: CreateNftBuildTransactionResult,
    _signTransactionResult: CreateNftSignTransactionResult,
    executeTransactionResult: CreateNftExecuteTransactionResult,
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
      adminPublicKey: normalisedParams.admin.publicKey,
      supplyPublicKey: normalisedParams.supply.publicKey,
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

    const outputData: CreateNftOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      adminAccountId: normalisedParams.admin.accountId,
      adminPublicKey: normalisedParams.admin.publicKey,
      supplyAccountId: normalisedParams.supply.accountId,
      supplyPublicKey: normalisedParams.supply.publicKey,
      alias: normalisedParams.alias,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export const createNft = (args: CommandHandlerArgs) =>
  new CreateNftCommand().execute(args);
