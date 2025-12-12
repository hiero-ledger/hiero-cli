/**
 * Token Create From File Command Handler
 * Handles token creation from JSON file definitions using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateTokenFromFileOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateTokenFile } from '@/plugins/token/utils/token-file-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateTokenFromFileInputSchema } from './input';

export async function createTokenFromFile(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = CreateTokenFromFileInputSchema.parse(args.args);

  const filename = validArgs.file;
  const providedKeyManager = validArgs.keyManager;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  logger.info(`Creating token from file: ${filename}`);

  try {
    const tokenDefinition = await readAndValidateTokenFile(filename, logger);

    const network = api.network.getCurrentNetwork();
    api.alias.availableOrThrow(tokenDefinition.name, network);

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

    const signingKeys = [adminKey.keyRefId, treasury.keyRefId];
    logger.info(
      `🔑 Signing transaction with admin key and treasury key (${signingKeys.length} keys)`,
    );
    const result = await api.txExecution.signAndExecuteWith(
      tokenCreateTransaction,
      signingKeys,
    );

    if (!result.success || !result.tokenId) {
      throw new Error('Token creation failed - no token ID returned');
    }

    const tokenData = buildTokenDataFromFile(
      result,
      tokenDefinition,
      treasury.accountId,
      adminKey.publicKey,
      network,
    );

    const successfulAssociations = await processTokenAssociations(
      result.tokenId,
      tokenDefinition.associations,
      api,
      logger,
      keyManager,
    );
    tokenData.associations = successfulAssociations;

    tokenState.saveToken(result.tokenId, tokenData);
    logger.info(`   Token data saved to state`);

    api.alias.register({
      alias: tokenDefinition.name,
      type: 'token',
      network,
      entityId: result.tokenId,
      createdAt: result.consensusTimestamp,
    });
    logger.info(`   Name registered: ${tokenDefinition.name}`);

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
        transactionId: result.transactionId,
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
