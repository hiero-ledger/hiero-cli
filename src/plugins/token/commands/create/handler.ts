/**
 * Token Create Command Handler
 * Handles token creation operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { CoreApi } from '../../../../core';
import { Logger } from '../../../../core';
import { TransactionResult } from '../../../../core';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { Transaction as HederaTransaction } from '@hashgraph/sdk';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TokenData, safeValidateTokenCreateParams } from '../../schema';
import {
  resolveTreasuryParameter,
  resolveKeyParameter,
} from '../../resolver-helper';
import { formatError } from '../../../../core/utils/errors';
import { CreateTokenOutput } from './output';
import { processBalanceInput } from '../../../../core/utils/process-balance-input';
import type { TokenCreateParams } from '../../../../core/types/token.types';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';

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
 * Treasury resolution result
 */
interface TreasuryResolution {
  treasuryId: string;
  keyRefId?: string;
  useCustom: boolean;
}

/**
 * Resolves the treasury account to use for token creation
 * @param api - Core API instance
 * @param treasuryId - Optional custom treasury ID
 * @param treasuryKeyRefId - Optional custom treasury key reference
 * @param treasuryPublicKey - Optional custom treasury public key
 * @returns Treasury resolution result
 */
function resolveTreasuryAccount(
  api: CoreApi,
  treasuryId?: string,
  treasuryKeyRefId?: string,
  treasuryPublicKey?: string,
): TreasuryResolution {
  if (treasuryId && treasuryKeyRefId && treasuryPublicKey) {
    return {
      treasuryId,
      keyRefId: treasuryKeyRefId,
      useCustom: true,
    };
  }

  // No treasury provided - get operator info (required for token creation)
  const currentNetwork = api.network.getCurrentNetwork();
  const operator = api.network.getOperator(currentNetwork);
  if (!operator) {
    throw new Error(
      'No operator credentials found. Please set up your Hedera account credentials or provide a treasury account.',
    );
  }

  return {
    treasuryId: operator.accountId,
    useCustom: false,
  };
}

/**
 * Executes the token creation transaction
 * @param api - Core API instance
 * @param transaction - Token creation transaction
 * @param treasury - Treasury resolution result
 * @param logger - Logger instance
 * @param adminKeyRefId - Optional admin key reference Id
 * @returns Transaction result
 */
async function executeTokenCreation(
  api: CoreApi,
  transaction: HederaTransaction,
  treasury: TreasuryResolution,
  logger: Logger,
  adminKeyRefId?: string,
): Promise<TransactionResult> {
  const keyRefIds: string[] = [];

  // Admin key must sign first for token creation
  if (adminKeyRefId) {
    logger.debug(`Token admin key: ${adminKeyRefId}`);
    keyRefIds.push(adminKeyRefId);
  }

  // Treasury key required to receive initial supply
  if (treasury.useCustom && treasury.keyRefId) {
    logger.debug(`Custom treasury key: ${treasury.keyRefId}`);
    keyRefIds.push(treasury.keyRefId);
  } else {
    const currentNetwork = api.network.getCurrentNetwork();
    const operator = api.network.getOperator(currentNetwork);
    if (!operator) {
      throw new Error('[TOKEN-CREATE] No operator configured');
    }
    logger.debug(`Using operator as treasury: ${operator.keyRefId}`);
    keyRefIds.push(operator.keyRefId);
  }

  logger.debug(`Signing token creation with ${keyRefIds.length} key(s)`);
  return api.txExecution.signAndExecuteWith(transaction, keyRefIds);
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
    keys: {
      adminKey: params.adminPublicKey,
      supplyKey: '',
      wipeKey: '',
      kycKey: '',
      freezeKey: '',
      pauseKey: '',
      feeScheduleKey: '',
      treasuryKey: params.treasuryPublicKey || '',
    },
    network: params.network,
    associations: [],
    customFees: [],
  };
}

export async function createToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validate command parameters
  const validationResult = safeValidateTokenCreateParams(args.args);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(
      (error) => `${error.path.join('.')}: ${error.message}`,
    );
    return {
      status: Status.Failure,
      errorMessage: `Invalid command parameters:\n${errorMessages.join('\n')}`,
    };
  }

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Use validated parameters with defaults
  const validatedParams = validationResult.data;
  const name = validatedParams.tokenName;
  const symbol = validatedParams.symbol;
  const keyManagerArg = args.args.keyManager as KeyManagerName | undefined;

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');
  const decimals = validatedParams.decimals || 0;
  const rawInitialSupply = validatedParams.initialSupply || 1000000;
  // Convert display units to raw token units
  const initialSupply = processBalanceInput(rawInitialSupply, decimals);
  const supplyType = validatedParams.supplyType || 'INFINITE';
  const maxSupply = validatedParams.maxSupply
    ? processBalanceInput(validatedParams.maxSupply, decimals)
    : undefined;
  const alias = validatedParams.name;

  // Check if alias already exists on the current network
  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  // Resolve treasury parameter (alias or treasury-id:treasury-key) if provided
  let treasuryId: string | undefined;
  let treasuryKeyRefId: string | undefined;
  let treasuryPublicKey: string | undefined;

  if (validatedParams.treasury) {
    const network = api.network.getCurrentNetwork();
    const resolvedTreasury = resolveTreasuryParameter(
      validatedParams.treasury,
      api,
      network,
      keyManager,
    );

    // Treasury was explicitly provided - it MUST resolve or fail
    if (!resolvedTreasury) {
      throw new Error(
        `Failed to resolve treasury parameter: ${validatedParams.treasury}. ` +
          `Expected format: account-alias OR treasury-id:treasury-key`,
      );
    }

    // Use resolved treasury from alias or treasury-id:treasury-key
    treasuryId = resolvedTreasury.treasuryId;
    treasuryKeyRefId = resolvedTreasury.treasuryKeyRefId;
    treasuryPublicKey = resolvedTreasury.treasuryPublicKey;

    logger.log(`🏦 Using custom treasury account: ${treasuryId}`);
    logger.log(`🔑 Will sign with treasury key`);
  }

  // Validate and determine maxSupply
  let finalMaxSupply: bigint | undefined = undefined;
  if (supplyType.toUpperCase() === 'FINITE') {
    finalMaxSupply = determineFiniteMaxSupply(maxSupply, initialSupply);
  } else if (maxSupply !== undefined) {
    logger.warn(
      `Max supply specified for INFINITE supply type - ignoring max supply parameter`,
    );
  }

  logger.log(`Creating token: ${name} (${symbol})`);
  if (finalMaxSupply !== undefined) {
    logger.log(`Max supply: ${finalMaxSupply}`);
  }

  try {
    // 1. Resolve treasury and admin key
    const treasury = resolveTreasuryAccount(
      api,
      treasuryId,
      treasuryKeyRefId,
      treasuryPublicKey,
    );

    // Resolve admin key - will use provided key or fall back to operator key
    const adminKey = resolveKeyParameter(validatedParams.adminKey, api);

    if (!adminKey) {
      throw new Error('Unable to resolve any adminKey for the token');
    }

    logger.debug('=== TOKEN PARAMS DEBUG ===');
    logger.debug(`Treasury ID: ${treasury.treasuryId}`);
    logger.debug(`Admin Key (keyRefId): ${adminKey?.keyRefId}`);
    logger.debug(`Use Custom Treasury: ${treasury.useCustom}`);
    logger.debug('=========================');

    // 2. Create and execute token transaction
    const tokenCreateParams: TokenCreateParams = {
      name,
      symbol,
      treasuryId: treasury.treasuryId,
      decimals,
      initialSupplyRaw: initialSupply,
      supplyType: supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
      maxSupplyRaw: finalMaxSupply,
      adminKey: adminKey.publicKey,
    };

    const tokenCreateTransaction =
      api.token.createTokenTransaction(tokenCreateParams);

    const result = await executeTokenCreation(
      api,
      tokenCreateTransaction,
      treasury,
      logger,
      adminKey.keyRefId,
    );

    // 3. Verify success and store token data
    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    const tokenData = buildTokenData(result, {
      name,
      symbol,
      treasuryId: treasury.treasuryId,
      decimals,
      initialSupply,
      supplyType,
      adminPublicKey: adminKey.publicKey,
      treasuryPublicKey,
      network: api.network.getCurrentNetwork(),
    });

    tokenState.saveToken(result.tokenId, tokenData);
    logger.log(`   Token data saved to state`);

    // Register alias if provided
    if (alias) {
      api.alias.register({
        alias,
        type: 'token',
        network: api.network.getCurrentNetwork(),
        entityId: result.tokenId,
        createdAt: result.consensusTimestamp,
      });
      logger.log(`   Name registered: ${alias}`);
    }

    // Prepare output data
    const outputData: CreateTokenOutput = {
      tokenId: result.tokenId,
      name,
      symbol,
      treasuryId: treasury.treasuryId,
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
