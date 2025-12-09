/**
 * Token Create Command Handler
 * Handles token creation operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { TransactionResult } from '../../../../core';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TokenData } from '../../schema';
import { formatError } from '../../../../core/utils/errors';
import { CreateTokenOutput } from './output';
import { processTokenBalanceInput } from '../../../../core/utils/process-token-balance-input';
import type { TokenCreateParams } from '../../../../core/types/token.types';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { CreateTokenInputSchema } from './input';

/**
 * Determines the final max supply value for FINITE supply tokens
 * @param maxSupply - The max supply value (if provided)
 * @param initialSupply - The initial supply value
 * @returns The calculated final max supply (defaults to initialSupply if not provided)
 */
function determineFiniteMaxSupply(
  maxSupply: bigint | undefined,
  initialSupply: bigint,
): bigint {
  if (maxSupply !== undefined) {
    if (maxSupply < initialSupply) {
      throw new Error(
        `Max supply (${maxSupply}) cannot be less than initial supply (${initialSupply})`,
      );
    }
    return maxSupply;
  }
  // Default to initial supply if no max supply specified for finite tokens
  return initialSupply;
}

/**
 * Builds the token data object for state storage
 * @param result - Transaction result
 * @param params - Token creation parameters
 * @returns Token data object
 */
function buildTokenData(
  result: TransactionResult,
  params: {
    name: string;
    symbol: string;
    treasuryId: string;
    decimals: number;
    initialSupply: bigint;
    supplyType: string;
    adminPublicKey: string;
    treasuryPublicKey?: string;
    network: SupportedNetwork;
  },
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: params.name,
    symbol: params.symbol,
    treasuryId: params.treasuryId,
    decimals: params.decimals,
    initialSupply: params.initialSupply,
    supplyType: params.supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
    maxSupply:
      params.supplyType.toUpperCase() === 'FINITE' ? params.initialSupply : 0n,
    adminPublicKey: params.adminPublicKey,
    network: params.network,
    associations: [],
    customFees: [],
  };
}

export async function createToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Validate command parameters
  const validArgs = CreateTokenInputSchema.parse(args.args);

  // Use validated parameters
  const name = validArgs.tokenName;
  const symbol = validArgs.symbol;
  const decimals = validArgs.decimals;
  const rawInitialSupply = validArgs.initialSupply;
  const supplyType = validArgs.supplyType;
  const alias = validArgs.name;
  const providedMaxSupply = validArgs.maxSupply;
  const providedKeyManager = validArgs.keyManager;

  // Get keyManager from args or fallback to config
  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  // Convert display units to raw token units
  const initialSupply = processTokenBalanceInput(rawInitialSupply, decimals);
  const maxSupply = providedMaxSupply
    ? processTokenBalanceInput(providedMaxSupply, decimals)
    : undefined;

  // Check if alias already exists on the current network
  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  const treasury = await api.keyResolver.resolveKeyOrAliasWithFallback(
    validArgs.treasury,
    keyManager,
    ['token:treasury'],
  );

  const admin = await api.keyResolver.resolveKeyOrAliasWithFallback(
    validArgs.adminKey,
    keyManager,
    ['token:admin'],
  );

  // Validate and determine maxSupply
  let finalMaxSupply: bigint | undefined = undefined;
  if (supplyType.toUpperCase() === 'FINITE') {
    finalMaxSupply = determineFiniteMaxSupply(maxSupply, initialSupply);
  } else if (maxSupply !== undefined) {
    logger.warn(
      `Max supply specified for INFINITE supply type - ignoring max supply parameter`,
    );
  }

  logger.info(`Creating token: ${name} (${symbol})`);
  if (finalMaxSupply !== undefined) {
    logger.info(`Max supply: ${finalMaxSupply}`);
  }

  try {
    logger.debug('=== TOKEN PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury?.keyRefId}`);
    logger.debug(`Admin Key (keyRefId): ${admin?.keyRefId}`);
    logger.debug(`Use Custom Treasury: ${String(Boolean(treasury))}`);
    logger.debug('=========================');

    // 2. Create and execute token transaction
    const tokenCreateParams: TokenCreateParams = {
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupplyRaw: initialSupply,
      supplyType: supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
      maxSupplyRaw: finalMaxSupply,
      adminPublicKey: admin.publicKey,
    };

    const tokenCreateTransaction =
      api.token.createTokenTransaction(tokenCreateParams);

    const txSigners = [treasury.keyRefId];

    if (validArgs.adminKey) {
      txSigners.push(admin.keyRefId);
    }

    const result = await api.txExecution.signAndExecuteWith(
      tokenCreateTransaction,
      txSigners,
    );

    // 3. Verify success and store token data
    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    const tokenData = buildTokenData(result, {
      name,
      symbol,
      treasuryId: treasury.accountId,
      decimals,
      initialSupply,
      supplyType,
      adminPublicKey: admin.publicKey.toStringRaw(),
      treasuryPublicKey: treasury.publicKey.toStringRaw(),
      network: api.network.getCurrentNetwork(),
    });

    tokenState.saveToken(result.tokenId, tokenData);
    logger.info(`   Token data saved to state`);

    // Register alias if provided
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

    // Prepare output data
    const outputData: CreateTokenOutput = {
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
      errorMessage: formatError('Failed to create token', error),
    };
  }
}
