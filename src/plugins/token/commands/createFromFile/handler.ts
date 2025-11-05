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
import { resolveTreasuryParameter } from '../../resolver-helper';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { formatError, toErrorMessage } from '../../../../utils/errors';
import { CreateTokenFromFileOutput } from './output';

// Import the token file schema from the original commands
const accountIdRegex = /^\d+\.\d+\.\d+$/;

const keysSchema = z
  .object({
    adminKey: z.string().min(1, 'adminKey is required'),
    supplyKey: z.string().min(1).optional(),
    wipeKey: z.string().min(1).optional(),
    kycKey: z.string().min(1).optional(),
    freezeKey: z.string().min(1).optional(),
    pauseKey: z.string().min(1).optional(),
    feeScheduleKey: z.string().min(1).optional(),
  })
  .strict();

const fixedFeeSchema = z
  .object({
    type: z.literal('fixed'),
    amount: z.number().int().positive('Amount must be positive'),
    unitType: z.literal('HBAR').optional().default('HBAR'),
    collectorId: z
      .string()
      .regex(accountIdRegex, 'collectorId must be a valid account id')
      .optional(),
    exempt: z.boolean().optional(),
  })
  .strict();

const customFeeSchema = fixedFeeSchema; // Only fixed fees supported

const accountSchema = z
  .object({
    accountId: z
      .string()
      .regex(accountIdRegex, 'accountId must be a valid account id'),
    key: z.string().min(1, 'account key is required'),
  })
  .strict();

// Treasury can be either:
// 1. A string (alias or treasury-id:treasury-key)
// 2. An object with accountId and key (legacy format)
const treasurySchema = z.union([
  z
    .string()
    .min(1, 'Treasury is required (either name or treasury-id:treasury-key)'),
  accountSchema,
]);

const tokenFileSchema = z
  .object({
    name: z.string().min(1).max(100),
    symbol: z.string().min(1).max(20),
    decimals: z.number().int().min(0).max(18),
    supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
    initialSupply: z.number().int().nonnegative(),
    maxSupply: z.number().int().nonnegative().default(0),
    treasury: treasurySchema,
    keys: keysSchema,
    associations: z.array(accountSchema).default([]),
    customFees: z.array(customFeeSchema).default([]),
    memo: z.string().max(100).optional().default(''),
  })
  .strict();

type TokenFileDefinition = z.infer<typeof tokenFileSchema>;

interface TokenValidationResult {
  valid: boolean;
  errors?: string[];
  data?: TokenFileDefinition;
}

function validateTokenFile(raw: unknown): TokenValidationResult {
  const parsed = tokenFileSchema.safeParse(raw);
  if (parsed.success) return { valid: true, data: parsed.data };
  return {
    valid: false,
    errors: parsed.error.issues.map(
      (i) => `${i.path.join('.') || '<root>'}: ${i.message}`,
    ),
  };
}

function resolveTokenFilePath(filename: string): string {
  const overrideDir = process.env.HCLI_TOKEN_INPUT_DIR;
  if (overrideDir && overrideDir.trim() !== '') {
    return path.join(overrideDir, `token.${filename}.json`);
  }
  return path.join(process.cwd(), 'src', 'input', `token.${filename}.json`);
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

  const validated = validateTokenFile(raw);
  if (!validated.valid || !validated.data) {
    logger.error('Token file validation failed');
    if (validated.errors && validated.errors.length) {
      validated.errors.forEach((e) => logger.error(e));
    }
    throw new Error('Invalid token definition file');
  }

  return validated.data;
}

/**
 * Resolves treasury from token file definition
 * Handles both string (alias or treasury-id:key) and object (legacy) formats
 * @param treasuryDef - Treasury definition from file
 * @param api - Core API instance
 * @param network - Current network
 * @param logger - Logger instance
 * @returns Resolved treasury information
 */
function resolveTreasuryFromDefinition(
  treasuryDef: string | { accountId: string; key: string },
  api: CoreApi,
  network: SupportedNetwork,
  logger: Logger,
): TreasuryFromFileResolution {
  if (typeof treasuryDef === 'string') {
    // New format: alias or treasury-id:treasury-key
    const resolvedTreasury = resolveTreasuryParameter(
      treasuryDef,
      api,
      network,
    );

    if (!resolvedTreasury) {
      throw new Error('Treasury parameter is required');
    }

    logger.log(`🏦 Using treasury: ${resolvedTreasury.treasuryId}`);

    return {
      treasuryId: resolvedTreasury.treasuryId,
      treasuryKeyRefId: resolvedTreasury.treasuryKeyRefId,
      treasuryPublicKey: resolvedTreasury.treasuryPublicKey,
    };
  }

  // Legacy format: object with accountId and key
  const imported = api.kms.importPrivateKey(treasuryDef.key);
  logger.log(`🏦 Using treasury (legacy format): ${treasuryDef.accountId}`);

  return {
    treasuryId: treasuryDef.accountId,
    treasuryKeyRefId: imported.keyRefId,
    treasuryPublicKey: imported.publicKey,
  };
}

/**
 * Builds token data object from file definition and transaction result
 * @param result - Transaction result
 * @param tokenDefinition - Token definition from file
 * @param treasury - Resolved treasury information
 * @param network - Current network
 * @returns Token data object for state storage
 */
function buildTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: TokenFileDefinition,
  treasury: TreasuryFromFileResolution,
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
      adminKey: tokenDefinition.keys.adminKey,
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
): Promise<Array<{ name: string; accountId: string }>> {
  if (associations.length === 0) {
    return [];
  }

  logger.log(`   Creating ${associations.length} token associations...`);
  const successfulAssociations: Array<{ name: string; accountId: string }> = [];

  for (const association of associations) {
    try {
      // Create association transaction
      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: association.accountId,
      });

      // Sign and execute with the account's key
      const associationImported = api.kms.importPrivateKey(association.key);
      const associateResult = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        { keyRefId: associationImported.keyRefId },
      );

      if (associateResult.success) {
        logger.log(
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
  const scriptArgs = (args.args['args'] as string[]) || [];

  logger.log(`Creating token from file: ${filename}`);

  try {
    // 1. Read and validate token file
    const tokenDefinition = await readAndValidateTokenFile(filename, logger);

    // 2. Resolve treasury (supports both string and object formats)
    const network = api.network.getCurrentNetwork();
    const treasury = resolveTreasuryFromDefinition(
      tokenDefinition.treasury,
      api,
      network,
      logger,
    );

    // 3. Create and execute token transaction
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
      adminKey: tokenDefinition.keys.adminKey,
      customFees: tokenDefinition.customFees.map((fee) => ({
        type: fee.type,
        amount: fee.amount,
        unitType: fee.unitType,
        collectorId: fee.collectorId,
        exempt: fee.exempt,
      })),
    });

    logger.log(`🔑 Using treasury key for signing transaction`);
    const result = await api.txExecution.signAndExecuteWith(
      tokenCreateTransaction,
      { keyRefId: treasury.treasuryKeyRefId },
    );

    // 4. Verify success
    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    // 5. Build token data for state
    const tokenData = buildTokenDataFromFile(
      result,
      tokenDefinition,
      treasury,
      network,
    );

    // 7. Process associations if specified
    const successfulAssociations = await processTokenAssociations(
      result.tokenId,
      tokenDefinition.associations,
      api,
      logger,
    );
    tokenData.associations = successfulAssociations;

    // 8. Save token to state
    tokenState.saveToken(result.tokenId, tokenData);
    logger.log(`   Token data saved to state`);

    // 9. Store script arguments if provided
    if (scriptArgs.length > 0) {
      logger.debug(`Storing script arguments: ${scriptArgs.join(', ')}`);
      // Note: In a full implementation, you'd store these in the state or dynamic variables system
    }

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
