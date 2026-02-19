import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateFungibleTokenOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
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
): Promise<CommandResult> {
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
  if (supplyType === SupplyType.FINITE) {
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
    supplyType,
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
    throw new StateError('Token creation completed but no token ID returned', {
      context: { transactionId: result.transactionId },
    });
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
    supplyType,
    transactionId: result.transactionId,
    alias,
    network: api.network.getCurrentNetwork(),
  };

  return { result: outputData };
}
