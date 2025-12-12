/**
 * Token Create From File Command Handler
 * Handles token creation from JSON file definitions using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { CoreApi } from '../../../../core';
import { Logger } from '../../../../core';
import { TransactionResult } from '../../../../core';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TokenData } from '../../schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { formatError, toErrorMessage } from '../../../../core/utils/errors';
import { CreateTokenFromFileOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { TokenFileSchema, TokenFileDefinition } from '../../schema';
import { CreateTokenFromFileInputSchema } from './input';
import { KeyOrAccountAlias } from '../../../../core/schemas';
import { PublicKey } from '@hashgraph/sdk';

function resolveTokenFilePath(filename: string): string {
  const hasPathSeparator = filename.includes('/') || filename.includes('\\');

  if (hasPathSeparator) {
    return filename;
  }

  return path.resolve(filename);
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
 * Builds token data object from file definition and transaction result
 * @param result - Transaction result
 * @param tokenDefinition - Token definition from file
 * @param treasuryId - Treasury Account id
 * @param adminPublicKey - Admin Account Public Key
 * @param network - Current network
 * @returns Token data object for state storage
 */
function buildTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: TokenFileDefinition,
  treasuryId: string,
  adminPublicKey: string,
  network: SupportedNetwork,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId,
    adminPublicKey,
    decimals: tokenDefinition.decimals,
    initialSupply: tokenDefinition.initialSupply,
    supplyType: tokenDefinition.supplyType.toUpperCase() as
      | 'FINITE'
      | 'INFINITE',
    maxSupply: tokenDefinition.maxSupply,
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
 * @param keyManager
 * @returns Array of successful associations
 */
async function processTokenAssociations(
  tokenId: string,
  associations: KeyOrAccountAlias[],
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
      const account = await api.keyResolver.getOrInitKey(
        association,
        keyManager,
        ['token:associate'],
      );

      // Create association transaction
      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: account.accountId,
      });

      const associateResult = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        [account.keyRefId],
      );

      if (associateResult.success) {
        logger.info(`   ✅ Associated account ${account.accountId} with token`);
        successfulAssociations.push({
          name: account.accountId, // Using accountId as name for now
          accountId: account.accountId,
        });
      } else {
        logger.warn(`   ⚠️  Failed to associate account ${account.accountId}`);
      }
    } catch (error) {
      const associationIdentifier =
        association.type === 'keypair'
          ? association.accountId
          : association.alias;
      logger.warn(
        `   ⚠️  Failed to associate account ${associationIdentifier}: ${toErrorMessage(error)}`,
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

  // Parse command arguments
  const validArgs = CreateTokenFromFileInputSchema.parse(args.args);

  // Extract command arguments
  const filename = validArgs.file;
  const providedKeyManager = validArgs.keyManager;

  // Get keyManager from args or fallback to config
  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  logger.info(`Creating token from file: ${filename}`);

  try {
    // 1. Read and validate token file
    const tokenDefinition = await readAndValidateTokenFile(filename, logger);

    // 2. Check if token name already exists as alias
    const network = api.network.getCurrentNetwork();
    api.alias.availableOrThrow(tokenDefinition.name, network);

    // 3. Resolve treasury (supports both string and object formats)
    const treasury = await api.keyResolver.getOrInitKey(
      tokenDefinition.treasuryKey,
      keyManager,
      ['token:treasury'],
    );

    const adminKey = await api.keyResolver.getOrInitKey(
      tokenDefinition.adminKey,
      keyManager,
      ['token:admin', `token:${tokenDefinition.name}`],
    );
    logger.info(`🔑 Resolved admin key for signing`);

    // 5. Create token transaction
    const tokenCreateTransaction = api.token.createTokenTransaction({
      name: tokenDefinition.name,
      symbol: tokenDefinition.symbol,
      treasuryId: treasury.accountId,
      decimals: tokenDefinition.decimals,
      initialSupplyRaw: tokenDefinition.initialSupply,
      supplyType: tokenDefinition.supplyType.toUpperCase() as
        | 'FINITE'
        | 'INFINITE',
      maxSupplyRaw: tokenDefinition.maxSupply,
      adminPublicKey: PublicKey.fromString(adminKey.publicKey),
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
    const signingKeys = [adminKey.keyRefId, treasury.keyRefId];
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
      treasury.accountId,
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
      treasuryId: treasury.accountId,
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
