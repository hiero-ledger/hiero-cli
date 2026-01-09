/**
 * Token Create Command Handler
 * Handles token creation operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/token.types';
import type { CreateNftOutput } from '@/plugins/token/commands/create-nft/output';

import { PublicKey } from '@hashgraph/sdk';

import { Status, TokenTypeEnum } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { CreateNftInputSchema } from '@/plugins/token/commands/create-nft/input';
import {
  buildTokenData,
  determineFiniteMaxSupply,
} from '@/plugins/token/utils/token-data-builders';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

export async function createNft(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = CreateNftInputSchema.parse(args.args);

  const name = validArgs.tokenName;
  const symbol = validArgs.symbol;
  const decimals = 0;
  const initialSupply = 0n;
  const tokenType = TokenTypeEnum.NON_FUNGIBLE_TOKEN;
  const supplyType = validArgs.supplyType;
  const alias = validArgs.name;
  const providedMaxSupply = validArgs.maxSupply;
  const providedKeyManager = validArgs.keyManager;
  const memo = validArgs.memo;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

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

  const supply = await api.keyResolver.getOrInitKeyWithFallback(
    validArgs.supplyKey,
    keyManager,
    ['token:supply'],
  );

  let finalMaxSupply: bigint | undefined = undefined;
  if (supplyType.toUpperCase() === 'FINITE') {
    finalMaxSupply = determineFiniteMaxSupply(maxSupply, initialSupply);
  } else if (maxSupply !== undefined) {
    logger.warn(
      `Max supply specified for INFINITE supply type - ignoring max supply parameter`,
    );
  }

  logger.info(`Creating NFT: ${name} (${symbol})`);
  if (finalMaxSupply !== undefined) {
    logger.info(`Max supply: ${finalMaxSupply}`);
  }

  try {
    logger.debug('=== NFT PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury?.keyRefId}`);
    logger.debug(`Admin Key (keyRefId): ${admin?.keyRefId}`);
    logger.debug(`Supply Key (keyRefId): ${supply?.keyRefId}`);
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

    const tokenCreateTransaction = api.token.createTokenTransaction({
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupplyRaw: initialSupply,
      tokenType: tokenType,
      supplyType: supplyType.toUpperCase() as SupplyType,
      maxSupplyRaw: finalMaxSupply,
      adminPublicKey: PublicKey.fromString(admin.publicKey),
      supplyPublicKey: PublicKey.fromString(supply.publicKey),
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
      throw new Error('NFT creation failed - no token ID returned');
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
      supplyPublicKey: supply.publicKey,
      network: api.network.getCurrentNetwork(),
    });

    tokenState.saveToken(result.tokenId, tokenData);
    logger.info(`   Non-fungible token data saved to state`);

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

    const outputData: CreateNftOutput = {
      tokenId: result.tokenId,
      name,
      symbol,
      treasuryId: treasury.accountId,
      supplyType: supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
      transactionId: result.transactionId,
      adminAccountId: admin.accountId,
      supplyAccountId: supply.accountId,
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
      errorMessage: formatError('Failed to create NFT', error),
    };
  }
}
