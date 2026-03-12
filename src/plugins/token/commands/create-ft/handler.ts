import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateFungibleTokenOutput } from './output';
import type {
  CreateFtBuildTransactionResult,
  CreateFtExecuteTransactionResult,
  CreateFtNormalizedParams,
  CreateFtSignTransactionResult,
} from './types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { resolveOptionalKey } from '@/plugins/token/utils/token-resolve-optional-key';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFungibleTokenInputSchema } from './input';

export class CreateFtCommand extends BaseTransactionCommand<
  CreateFtNormalizedParams,
  CreateFtBuildTransactionResult,
  CreateFtSignTransactionResult,
  CreateFtExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateFtNormalizedParams> {
    const { api, logger } = args;
    const validArgs = CreateFungibleTokenInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManagerName>('default_key_manager');
    const initialSupply = processTokenBalanceInput(
      validArgs.initialSupply,
      validArgs.decimals,
    );
    const maxSupply = validArgs.maxSupply
      ? processTokenBalanceInput(validArgs.maxSupply, validArgs.decimals)
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
    const supply = await resolveOptionalKey(
      validArgs.supplyKey,
      keyManager,
      api.keyResolver,
      'token:supply',
    );

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
    logger.debug(`Admin Key (keyRefId): ${admin.keyRefId}`);
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
      admin,
      supply,
      finalMaxSupply,
      adminKeyProvided: Boolean(validArgs.adminKey),
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateFtNormalizedParams,
  ): Promise<CreateFtBuildTransactionResult> {
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
      supplyPublicKey: normalisedParams.supply
        ? PublicKey.fromString(normalisedParams.supply.publicKey)
        : undefined,
      memo: normalisedParams.memo,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateFtNormalizedParams,
    buildTransactionResult: CreateFtBuildTransactionResult,
  ): Promise<CreateFtSignTransactionResult> {
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
    _normalisedParams: CreateFtNormalizedParams,
    _buildTransactionResult: CreateFtBuildTransactionResult,
    signTransactionResult: CreateFtSignTransactionResult,
  ): Promise<CreateFtExecuteTransactionResult> {
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
    normalisedParams: CreateFtNormalizedParams,
    _buildTransactionResult: CreateFtBuildTransactionResult,
    _signTransactionResult: CreateFtSignTransactionResult,
    executeTransactionResult: CreateFtExecuteTransactionResult,
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
      supplyPublicKey: normalisedParams.supply?.publicKey,
      network: normalisedParams.network,
    });

    const key = composeKey(normalisedParams.network, result.tokenId!);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

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

    const outputData: CreateFungibleTokenOutput = {
      tokenId: result.tokenId!,
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply.toString(),
      supplyType: normalisedParams.supplyType,
      transactionId: result.transactionId,
      alias: normalisedParams.alias,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export const createFt = (args: CommandHandlerArgs) =>
  new CreateFtCommand().execute(args);

export const createToken = createFt;
