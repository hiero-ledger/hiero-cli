/**
 * Fungible Token Create Command Handler
 * Handles fungible token creation operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/token.types';
import type { CreateFungibleTokenOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { HederaTokenType, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { resolveOptionalKey } from '@/plugins/token/utils/token-resolve-optional-key';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFungibleTokenInputSchema } from './input';

export async function createToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = CreateFungibleTokenInputSchema.parse(args.args);

  const name = validArgs.tokenName;
  const symbol = validArgs.symbol;
  const decimals = validArgs.decimals;
  const rawInitialSupply = validArgs.initialSupply;
  const supplyType = validArgs.supplyType;
  const alias = validArgs.name;
  const providedMaxSupply = validArgs.maxSupply;
  const providedKeyManager = validArgs.keyManager;
  const memo = validArgs.memo;
  const tokenType = HederaTokenType.FUNGIBLE_COMMON;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  const initialSupply = processTokenBalanceInput(rawInitialSupply, decimals);
  const maxSupply = providedMaxSupply
    ? processTokenBalanceInput(providedMaxSupply, decimals)
    : undefined;

  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  const treasury = await api.keyResolver.getOrInitKeyWithFallback(
    validArgs.treasury,
    keyManager,
    ['token:treasury'],
  );

  const admin = await api.keyResolver.getOrInitKeyWithFallback(
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

  let finalMaxSupply: bigint | undefined = undefined;
  if (supplyType.toUpperCase() === 'FINITE') {
    finalMaxSupply = determineFiniteMaxSupply(maxSupply, initialSupply);
  } else if (maxSupply !== undefined) {
    logger.warn(
      `Max supply specified for INFINITE supply type - ignoring max supply parameter`,
    );
  }

  logger.info(`Creating fungible token: ${name} (${symbol})`);
  if (finalMaxSupply !== undefined) {
    logger.info(`Max supply: ${finalMaxSupply}`);
  }

  try {
    logger.debug('=== TOKEN PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury?.keyRefId}`);
    logger.debug(`Admin Key (keyRefId): ${admin?.keyRefId}`);
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

    const tokenCreateTransaction = api.token.createTokenTransaction({
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupplyRaw: initialSupply,
      tokenType,
      supplyType: supplyType.toUpperCase() as SupplyType,
      maxSupplyRaw: finalMaxSupply,
      adminPublicKey: PublicKey.fromString(admin.publicKey),
      supplyPublicKey: supply
        ? PublicKey.fromString(supply.publicKey)
        : undefined,
      memo,
    });

    const txSigners = [treasury.keyRefId];

    if (validArgs.adminKey) {
      txSigners.push(admin.keyRefId);
    }

    const result = await api.txExecution.signAndExecuteWith(
      tokenCreateTransaction,
      txSigners,
    );

    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    const tokenData = buildTokenData(result, {
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupply,
      tokenType,
      supplyType,
      adminPublicKey: admin.publicKey,
      supplyPublicKey: supply ? supply.publicKey : undefined,
      network: api.network.getCurrentNetwork(),
    });

    tokenState.saveToken(result.tokenId, tokenData);
    logger.info(`   Token data saved to state`);

    if (alias) {
      api.alias.register({
        alias,
        type: 'token',
        network: api.network.getCurrentNetwork(),
        entityId: result.tokenId,
        createdAt: result.consensusTimestamp,
      });
      logger.info(`   Name registered: ${alias}`);
    }

    const outputData: CreateFungibleTokenOutput = {
      tokenId: result.tokenId,
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupply: initialSupply.toString(),
      supplyType: supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
      transactionId: result.transactionId,
      alias,
      network: api.network.getCurrentNetwork(),
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create fungible token', error),
    };
  }
}
