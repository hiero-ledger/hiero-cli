import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupplyType } from '@/core/types/shared.types';
import type { CreateNftFromFileOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildNftTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { readAndValidateNftTokenFile } from '@/plugins/token/utils/token-file-helpers';
import {
  resolveOptionalKey,
  toPublicKey,
} from '@/plugins/token/utils/token-resolve-optional-key';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateNftFromFileInputSchema } from './input';

export async function createNftFromFile(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = CreateNftFromFileInputSchema.parse(args.args);

  const filename = validArgs.file;
  const providedKeyManager = validArgs.keyManager;

  const keyManager =
    providedKeyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  logger.info(`Creating NFT token from file: ${filename}`);

  const tokenDefinition = await readAndValidateNftTokenFile(filename, logger);

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

  const supplyKey = await api.keyResolver.getOrInitKey(
    tokenDefinition.supplyKey,
    keyManager,
    ['token:supply'],
  );
  logger.info(`🔑 Resolved supply key for signing`);

  const wipeKey = await resolveOptionalKey(
    tokenDefinition.wipeKey,
    keyManager,
    api.keyResolver,
    'token:wipe',
  );

  const kycKey = await resolveOptionalKey(
    tokenDefinition.kycKey,
    keyManager,
    api.keyResolver,
    'token:kyc',
  );

  const freezeKey = await resolveOptionalKey(
    tokenDefinition.freezeKey,
    keyManager,
    api.keyResolver,
    'token:freeze',
  );

  const pauseKey = await resolveOptionalKey(
    tokenDefinition.pauseKey,
    keyManager,
    api.keyResolver,
    'token:pause',
  );

  const feeScheduleKey = await resolveOptionalKey(
    tokenDefinition.feeScheduleKey,
    keyManager,
    api.keyResolver,
    'token:feeSchedule',
  );

  const tokenCreateTransaction = api.token.createTokenTransaction({
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId: treasury.accountId,
    decimals: 0,
    initialSupplyRaw: 0n,
    tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
    supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
    maxSupplyRaw: tokenDefinition.maxSupply ?? 0n,
    adminPublicKey: PublicKey.fromString(adminKey.publicKey),
    supplyPublicKey: PublicKey.fromString(supplyKey.publicKey),
    wipePublicKey: toPublicKey(wipeKey),
    kycPublicKey: toPublicKey(kycKey),
    freezePublicKey: toPublicKey(freezeKey),
    pausePublicKey: toPublicKey(pauseKey),
    feeSchedulePublicKey: toPublicKey(feeScheduleKey),
    memo: tokenDefinition.memo,
  });

  const signingKeys = [
    adminKey.keyRefId,
    treasury.keyRefId,
    supplyKey.keyRefId,
  ];
  logger.info(
    `🔑 Signing transaction with admin, treasury and supply keys (${signingKeys.length} keys)`,
  );
  const result = await api.txExecution.signAndExecuteWith(
    tokenCreateTransaction,
    signingKeys,
  );

  if (!result.success || !result.tokenId) {
    throw new StateError('NFT creation completed but no token ID returned', {
      context: { transactionId: result.transactionId },
    });
  }

  const tokenData = buildNftTokenDataFromFile(
    result,
    tokenDefinition,
    treasury.accountId,
    adminKey.publicKey,
    supplyKey.publicKey,
    network,
    {
      wipePublicKey: wipeKey?.publicKey,
      kycPublicKey: kycKey?.publicKey,
      freezePublicKey: freezeKey?.publicKey,
      pausePublicKey: pauseKey?.publicKey,
      feeSchedulePublicKey: feeScheduleKey?.publicKey,
    },
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

  const outputData: CreateNftFromFileOutput = {
    tokenId: result.tokenId,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId: treasury.accountId,
    adminAccountId: adminKey.accountId,
    supplyAccountId: supplyKey.accountId,
    supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
    transactionId: result.transactionId,
    network,
    associations: successfulAssociations.map((assoc) => ({
      accountId: assoc.accountId,
      name: assoc.name,
      success: true,
      transactionId: result.transactionId,
    })),
  };

  return { result: outputData };
}
