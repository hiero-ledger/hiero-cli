/**
 * Token Create From File Command Handler
 * Handles token creation from JSON file definitions using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { CoreApi } from '../../../../core/core-api/core-api.interface';
import { Logger } from '../../../../core/services/logger/logger-service.interface';
import { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TokenData } from '../../schema';
import {
  resolveTreasuryParameter,
  resolveKeyParameter,
} from '../../resolver-helper';
import * as fs from 'fs/promises';
import * as path from 'path';
import { formatError, toErrorMessage } from '../../../../core/utils/errors';
import { CreateTokenFromFileOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { parseKeyWithType } from '../../../../core/utils/keys';
import { TokenFileSchema, TokenFileDefinition } from '../../schema';

function resolveTokenFilePath(filename: string): string {
  const hasPathSeparator = filename.includes('/') || filename.includes('\\');

  if (hasPathSeparator) {
    return filename;
  }

  return path.resolve(filename);
}

/**
 * Treasury resolution result from file
 */
interface TreasuryFromFileResolution {
  treasuryId: string;
  treasuryKeyRefId: string;
  treasuryPublicKey: string;
}

/**
 * Reads and validates the token definition file
 * @param filename - Token file name
 * @param logger - Logger instance
 * @returns Validated token definition
 */
async function readAndValidateTokenFile(
  filename: string,
  logger: Logger,
): Promise<TokenFileDefinition> {
  const filepath = resolveTokenFilePath(filename);
  logger.debug(`Reading token file from: ${filepath}`);

  const fileContent = await fs.readFile(filepath, 'utf-8');
  const raw = JSON.parse(fileContent) as unknown;

  const parsed = TokenFileSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Token file validation failed');
    parsed.error.issues.forEach((issue) => {
      logger.error(`${issue.path.join('.') || '<root>'}: ${issue.message}`);
    });
    throw new Error('Invalid token definition file');
  }

  return parsed.data;
}

/**
 * Resolves treasury from token file definition
 * @param treasuryDef - Treasury definition (name or treasury-id:treasury-key)
 * @param api - Core API instance
 * @param network - Current network
 * @param logger - Logger instance
 * @returns Resolved treasury information
 */
function resolveTreasuryFromDefinition(
  treasuryDef: string,
  api: CoreApi,
  network: SupportedNetwork,
  logger: Logger,
  keyManager: KeyManagerName,
): TreasuryFromFileResolution {
  const resolvedTreasury = resolveTreasuryParameter(
    treasuryDef,
    api,
    network,
    keyManager,
  );

  if (!resolvedTreasury) {
    throw new Error('Treasury parameter is required');
  }

  logger.info(`🏦 Using treasury: ${resolvedTreasury.treasuryId}`);

  return {
    treasuryId: resolvedTreasury.treasuryId,
    treasuryKeyRefId: resolvedTreasury.treasuryKeyRefId,
    treasuryPublicKey: resolvedTreasury.treasuryPublicKey,
  };
}

/**
 * Builds token data object from file definition and transaction result
 * @param result - Transaction result
 * @param tokenDefinition - Token definition from file
 * @param treasury - Resolved treasury information
 * @param adminPublicKey - Resolved admin public key
 * @param network - Current network
 * @returns Token data object for state storage
 */
function buildTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: TokenFileDefinition,
  treasury: TreasuryFromFileResolution,
  adminPublicKey: string,
  network: SupportedNetwork,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId: treasury.treasuryId,
    decimals: tokenDefinition.decimals,
    initialSupply: tokenDefinition.initialSupply,
    supplyType: tokenDefinition.supplyType.toUpperCase() as
      | 'FINITE'
      | 'INFINITE',
    maxSupply: tokenDefinition.maxSupply,
    keys: {
      adminKey: adminPublicKey,
      supplyKey: tokenDefinition.keys.supplyKey || '',
      wipeKey: tokenDefinition.keys.wipeKey || '',
      kycKey: tokenDefinition.keys.kycKey || '',
      freezeKey: tokenDefinition.keys.freezeKey || '',
      pauseKey: tokenDefinition.keys.pauseKey || '',
      feeScheduleKey: tokenDefinition.keys.feeScheduleKey || '',
      treasuryKey: treasury.treasuryPublicKey,
    },
    network,
    associations: [],
    customFees: tokenDefinition.customFees.map((fee) => ({
      type: fee.type,
      amount: fee.amount,
      unitType: fee.unitType,
      collectorId: fee.collectorId,
      exempt: fee.exempt,
    })),

    memo: tokenDefinition.memo,
  };
}

/**
 * Processes token associations from file definition
 * @param tokenId - Created token ID
 * @param associations - Association definitions from file
 * @param api - Core API instance
 * @param logger - Logger instance
 * @returns Array of successful associations
 */
async function processTokenAssociations(
  tokenId: string,
  associations: Array<{ accountId: string; key: string }>,
  api: CoreApi,
  logger: Logger,
  keyManager: KeyManagerName,
): Promise<Array<{ name: string; accountId: string }>> {
  if (associations.length === 0) {
    return [];
  }

  logger.info(`   Creating ${associations.length} token associations...`);
  const successfulAssociations: Array<{ name: string; accountId: string }> = [];

  for (const association of associations) {
    try {
      // Create association transaction
      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: association.accountId,
      });

      // Sign and execute with the account's key
      // Parse private key - check if it has a key type prefix (e.g., "ed25519:...")
      const { keyType, privateKey } = parseKeyWithType(association.key);
      const associationImported = api.kms.importPrivateKey(
        keyType,
        privateKey,
        keyManager,
        ['token:association', `account:${association.accountId}`],
      );
      const associateResult = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        [associationImported.keyRefId],
      );

      if (associateResult.success) {
        logger.info(
          `   ✅ Associated account ${association.accountId} with token`,
        );
        successfulAssociations.push({
          name: association.accountId, // Using accountId as name for now
          accountId: association.accountId,
        });
      } else {
        logger.warn(
          `   ⚠️  Failed to associate account ${association.accountId}`,
        );
      }
    } catch (error) {
      logger.warn(
        `   ⚠️  Failed to associate account ${association.accountId}: ${toErrorMessage(error)}`,
      );
    }
  }

  return successfulAssociations;
}

export async function createTokenFromFile(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Extract command arguments
  const filename = args.args['file'] as string;
  const keyManagerArg = args.args.keyManager as KeyManagerName | undefined;

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  logger.info(`Creating token from file: ${filename}`);

  try {
    // 1. Read and validate token file
    const tokenDefinition = await readAndValidateTokenFile(filename, logger);

    // 2. Check if token name already exists as alias
    const network = api.network.getCurrentNetwork();
    api.alias.availableOrThrow(tokenDefinition.name, network);

    // 3. Resolve treasury (supports both string and object formats)
    const treasury = resolveTreasuryFromDefinition(
      tokenDefinition.treasury,
      api,
      network,
      logger,
      keyManager,
    );

    // 4. Resolve adminKey (supports alias or raw private key)
    const adminKey = resolveKeyParameter(tokenDefinition.keys.adminKey, api, {
      keyManager,
      tags: ['token:admin', `token:${tokenDefinition.name}`],
    });

    if (!adminKey || !adminKey.keyRefId) {
      throw new Error('Unable to resolve admin key for the token');
    }
    logger.info(`🔑 Resolved admin key for signing`);

    // 5. Create token transaction
    const tokenCreateTransaction = api.token.createTokenTransaction({
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      treasuryId: treasury.treasuryId,
      decimals: tokenDefinition.decimals,
      initialSupplyRaw: tokenDefinition.initialSupply,
      supplyType: tokenDefinition.supplyType.toUpperCase() as
        | 'FINITE'
        | 'INFINITE',
      maxSupplyRaw: tokenDefinition.maxSupply,
      adminKey: adminKey.publicKey,
      customFees: tokenDefinition.customFees.map((fee) => ({
        type: fee.type,
        amount: fee.amount,
        unitType: fee.unitType,
        collectorId: fee.collectorId,
        exempt: fee.exempt,
      })),
      memo: tokenDefinition.memo,
    });

    // 6. Sign with both admin key and treasury key
    const signingKeys = [adminKey.keyRefId, treasury.treasuryKeyRefId];
    logger.info(
      `🔑 Signing transaction with admin key and treasury key (${signingKeys.length} keys)`,
    );
    const result = await api.txExecution.signAndExecuteWith(
      tokenCreateTransaction,
      signingKeys,
    );

    // 7. Verify success
    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    // 8. Build token data for state
    const tokenData = buildTokenDataFromFile(
      result,
      tokenDefinition,
      treasury,
      adminKey.publicKey,
      network,
    );

    // 9. Process associations if specified
    const successfulAssociations = await processTokenAssociations(
      result.tokenId,
      tokenDefinition.associations,
      api,
      logger,
      keyManager,
    );
    tokenData.associations = successfulAssociations;

    // 10. Save token to state
    tokenState.saveToken(result.tokenId, tokenData);
    logger.info(`   Token data saved to state`);

    // 11. Register token name as alias
    api.alias.register({
      alias: tokenDefinition.name,
      type: 'token',
      network,
      entityId: result.tokenId,
      createdAt: result.consensusTimestamp,
    });
    logger.info(`   Name registered: ${tokenDefinition.name}`);

    // Prepare output data
    const outputData: CreateTokenFromFileOutput = {
      tokenId: result.tokenId,
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      treasuryId: treasury.treasuryId,
      decimals: tokenDefinition.decimals,
      initialSupply: tokenDefinition.initialSupply.toString(),
      supplyType: tokenDefinition.supplyType.toUpperCase() as
        | 'FINITE'
        | 'INFINITE',
      transactionId: result.transactionId,
      network,
      associations: successfulAssociations.map((assoc) => ({
        accountId: assoc.accountId,
        name: assoc.name,
        success: true,
        transactionId: result.transactionId, // Use the token creation transaction ID for now
      })),
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create token from file', error),
    };
  }
}
