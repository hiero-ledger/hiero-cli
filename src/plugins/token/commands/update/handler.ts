import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { TokenData } from '@/plugins/token/schema';
import type { TokenUpdateOutput } from './output';
import type {
  TokenUpdateBuildTransactionResult,
  TokenUpdateExecuteTransactionResult,
  TokenUpdateNormalizedParams,
  TokenUpdateSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { NULL_TOKEN } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { toNullableHederaKey } from '@/core/utils/keys-to-hedera-key';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { buildUpdatedTokenData } from '@/plugins/token/utils/token-data-builders';
import { resolveOptionalKeys } from '@/plugins/token/utils/token-key-resolver';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenUpdateInputSchema } from './input';

export const TOKEN_UPDATE_COMMAND_NAME = 'token_update';

export class TokenUpdateCommand extends BaseTransactionCommand<
  TokenUpdateNormalizedParams,
  TokenUpdateBuildTransactionResult,
  TokenUpdateSignTransactionResult,
  TokenUpdateExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_UPDATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenUpdateNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenUpdateInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${validArgs.token}`, {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const memoInput = validArgs.memo === NULL_TOKEN ? null : validArgs.memo;
    const newAdminKeyInput =
      validArgs.newAdminKeys === NULL_TOKEN ? null : validArgs.newAdminKeys;
    const kycKeyInput =
      validArgs.kycKey === NULL_TOKEN ? null : validArgs.kycKey;
    const freezeKeyInput =
      validArgs.freezeKey === NULL_TOKEN ? null : validArgs.freezeKey;
    const wipeKeyInput =
      validArgs.wipeKey === NULL_TOKEN ? null : validArgs.wipeKey;
    const supplyKeyInput =
      validArgs.supplyKey === NULL_TOKEN ? null : validArgs.supplyKey;
    const feeScheduleKeyInput =
      validArgs.feeScheduleKey === NULL_TOKEN ? null : validArgs.feeScheduleKey;
    const pauseKeyInput =
      validArgs.pauseKey === NULL_TOKEN ? null : validArgs.pauseKey;
    const metadataKeyInput =
      validArgs.metadataKey === NULL_TOKEN ? null : validArgs.metadataKey;

    const signerKeyRefIds = new Set<string>();

    const adminSigningKeysResult = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.admin_key,
      explicitCredentials: validArgs.adminKeys,
      keyManager,
      signingKeyLabels: ['token:admin'],
      emptyMirrorRoleKeyMessage: 'This token has no admin key on Hedera.',
      insufficientKmsMatchesMessage:
        'Not enough admin key(s) not found in key manager for this token. Provide --admin-key.',
      validationErrorOptions: {
        context: { tokenId: tokenInfo.token_id },
      },
    });
    const adminKeyRefIds = adminSigningKeysResult?.keyRefIds ?? [];
    adminKeyRefIds.forEach((adminKey) => signerKeyRefIds.add(adminKey));

    let newTreasuryAccountKeyRefId: string | undefined;
    let newTreasuryAccountId: string | undefined;
    if (validArgs.treasury) {
      const treasuryCredential = await this.resolveTreasuryKeyRefId(
        api,
        validArgs.currentTreasuryKey,
        tokenInfo.treasury_account_id,
        keyManager,
      );
      newTreasuryAccountId = treasuryCredential.accountId;
      newTreasuryAccountKeyRefId = treasuryCredential.keyRefId;
      signerKeyRefIds.add(treasuryCredential.keyRefId);
    }

    const resolveUpdateableKeys = async (
      input: Credential[] | null,
      tag: string,
    ): Promise<ResolvedPublicKey[] | null> => {
      if (input === null) return null;
      return resolveOptionalKeys(input, keyManager, api.keyResolver, tag);
    };

    const [
      newAdminKeys,
      kycKeys,
      freezeKeys,
      wipeKeys,
      supplyKeys,
      feeScheduleKeys,
      pauseKeys,
      metadataKeys,
    ] = await Promise.all([
      resolveUpdateableKeys(newAdminKeyInput, 'token:admin'),
      resolveUpdateableKeys(kycKeyInput, 'token:kyc'),
      resolveUpdateableKeys(freezeKeyInput, 'token:freeze'),
      resolveUpdateableKeys(wipeKeyInput, 'token:wipe'),
      resolveUpdateableKeys(supplyKeyInput, 'token:supply'),
      resolveUpdateableKeys(feeScheduleKeyInput, 'token:feeSchedule'),
      resolveUpdateableKeys(pauseKeyInput, 'token:pause'),
      resolveUpdateableKeys(metadataKeyInput, 'token:metadata'),
    ]);
    if (newAdminKeys) {
      newAdminKeys.forEach((adminKey) =>
        signerKeyRefIds.add(adminKey.keyRefId),
      );
    }

    const metadata = validArgs.metadata
      ? new TextEncoder().encode(validArgs.metadata)
      : undefined;

    logger.info(`Updating token ${tokenId} on ${network}`);

    return {
      tokenId,
      tokenInfo,
      stateKey: composeKey(network, tokenId),
      network,
      keyManager,
      newName: validArgs.tokenName,
      newSymbol: validArgs.symbol,
      newTreasuryId: newTreasuryAccountId,
      adminKeyRefIds,
      newTreasuryKeyRefId: newTreasuryAccountKeyRefId,
      newAdminKeys,
      newAdminKeyThreshold: validArgs.newAdminKeyThreshold,
      kycKeys,
      kycKeyThreshold: validArgs.kycKeyThreshold,
      freezeKeys,
      freezeKeyThreshold: validArgs.freezeKeyThreshold,
      wipeKeys,
      wipeKeyThreshold: validArgs.wipeKeyThreshold,
      supplyKeys,
      supplyKeyThreshold: validArgs.supplyKeyThreshold,
      feeScheduleKeys,
      feeScheduleKeyThreshold: validArgs.feeScheduleKeyThreshold,
      pauseKeys,
      pauseKeyThreshold: validArgs.pauseKeyThreshold,
      metadataKeys,
      metadataKeyThreshold: validArgs.metadataKeyThreshold,
      memo: memoInput,
      autoRenewAccountId: validArgs.autoRenewAccount,
      autoRenewPeriodSeconds: validArgs.autoRenewPeriod,
      expirationTime: validArgs.expirationTime,
      metadata,
      keyRefIds: [...signerKeyRefIds],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenUpdateNormalizedParams,
  ): Promise<TokenUpdateBuildTransactionResult> {
    const { api } = args;

    const adminKey = toNullableHederaKey(
      normalisedParams.newAdminKeys,
      normalisedParams.newAdminKeyThreshold,
    );

    const kycKey = toNullableHederaKey(
      normalisedParams.kycKeys,
      normalisedParams.kycKeyThreshold,
    );
    const freezeKey = toNullableHederaKey(
      normalisedParams.freezeKeys,
      normalisedParams.freezeKeyThreshold,
    );
    const wipeKey = toNullableHederaKey(
      normalisedParams.wipeKeys,
      normalisedParams.wipeKeyThreshold,
    );
    const supplyKey = toNullableHederaKey(
      normalisedParams.supplyKeys,
      normalisedParams.supplyKeyThreshold,
    );
    const feeScheduleKey = toNullableHederaKey(
      normalisedParams.feeScheduleKeys,
      normalisedParams.feeScheduleKeyThreshold,
    );
    const pauseKey = toNullableHederaKey(
      normalisedParams.pauseKeys,
      normalisedParams.pauseKeyThreshold,
    );
    const metadataKey = toNullableHederaKey(
      normalisedParams.metadataKeys,
      normalisedParams.metadataKeyThreshold,
    );

    const transaction = api.token.createUpdateTokenTransaction({
      tokenId: normalisedParams.tokenId,
      name: normalisedParams.newName,
      symbol: normalisedParams.newSymbol,
      treasuryId: normalisedParams.newTreasuryId,
      adminKey,
      kycKey,
      freezeKey,
      wipeKey,
      supplyKey,
      feeScheduleKey,
      pauseKey,
      metadataKey,
      memo: normalisedParams.memo,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      autoRenewPeriodSeconds: normalisedParams.autoRenewPeriodSeconds,
      expirationTime: normalisedParams.expirationTime,
      metadata: normalisedParams.metadata,
    });

    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenUpdateNormalizedParams,
    buildTransactionResult: TokenUpdateBuildTransactionResult,
  ): Promise<TokenUpdateSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: TokenUpdateNormalizedParams,
    _buildTransactionResult: TokenUpdateBuildTransactionResult,
    signTransactionResult: TokenUpdateSignTransactionResult,
  ): Promise<TokenUpdateExecuteTransactionResult> {
    const { api } = args;

    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Failed to update token (txId: ${result.transactionId})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TokenUpdateNormalizedParams,
    _buildTransactionResult: TokenUpdateBuildTransactionResult,
    _signTransactionResult: TokenUpdateSignTransactionResult,
    executeTransactionResult: TokenUpdateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const tokenInfo = normalisedParams.tokenInfo;

    const updatedFields = this.buildUpdatedFields(normalisedParams);

    const existing = tokenState.getToken(normalisedParams.stateKey);

    const tokenData: TokenData = buildUpdatedTokenData(
      normalisedParams,
      tokenInfo,
      existing,
    );

    tokenState.saveToken(normalisedParams.stateKey, tokenData);
    logger.info('Token data saved to state');

    const outputData: TokenUpdateOutput = {
      tokenId: normalisedParams.tokenId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId ?? '',
      updatedFields,
    };

    return { result: outputData };
  }

  private buildUpdatedFields(
    normalisedParams: TokenUpdateNormalizedParams,
  ): string[] {
    const updatedFields: string[] = [];
    if (normalisedParams.newName !== undefined) updatedFields.push('name');
    if (normalisedParams.newSymbol !== undefined) updatedFields.push('symbol');
    if (normalisedParams.newTreasuryId !== undefined)
      updatedFields.push('treasury');
    if (
      normalisedParams.newAdminKeys === null ||
      normalisedParams.newAdminKeys.length > 0
    )
      updatedFields.push('adminKey');
    if (
      normalisedParams.kycKeys === null ||
      normalisedParams.kycKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.kycKeys === null ? 'kycKey (cleared)' : 'kycKey',
      );
    if (
      normalisedParams.freezeKeys === null ||
      normalisedParams.freezeKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.freezeKeys === null
          ? 'freezeKey (cleared)'
          : 'freezeKey',
      );
    if (
      normalisedParams.wipeKeys === null ||
      normalisedParams.wipeKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.wipeKeys === null ? 'wipeKey (cleared)' : 'wipeKey',
      );
    if (
      normalisedParams.supplyKeys === null ||
      normalisedParams.supplyKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.supplyKeys === null
          ? 'supplyKey (cleared)'
          : 'supplyKey',
      );
    if (
      normalisedParams.feeScheduleKeys === null ||
      normalisedParams.feeScheduleKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.feeScheduleKeys === null
          ? 'feeScheduleKey (cleared)'
          : 'feeScheduleKey',
      );
    if (
      normalisedParams.pauseKeys === null ||
      normalisedParams.pauseKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.pauseKeys === null ? 'pauseKey (cleared)' : 'pauseKey',
      );
    if (
      normalisedParams.metadataKeys === null ||
      normalisedParams.metadataKeys.length > 0
    )
      updatedFields.push(
        normalisedParams.metadataKeys === null
          ? 'metadataKey (cleared)'
          : 'metadataKey',
      );
    if (normalisedParams.memo !== undefined)
      updatedFields.push(
        normalisedParams.memo === null ? 'memo (cleared)' : 'memo',
      );
    if (normalisedParams.autoRenewAccountId !== undefined)
      updatedFields.push('autoRenewAccount');
    if (normalisedParams.autoRenewPeriodSeconds !== undefined)
      updatedFields.push('autoRenewPeriod');
    if (normalisedParams.expirationTime !== undefined)
      updatedFields.push('expirationTime');
    if (normalisedParams.metadata !== undefined) updatedFields.push('metadata');
    return updatedFields;
  }

  private async resolveTreasuryKeyRefId(
    api: CoreApi,
    explicitKey: Credential | undefined,
    treasuryAccountId: string,
    keyManager: KeyManager,
  ): Promise<ResolvedAccountCredential> {
    if (explicitKey) {
      const resolved = await api.keyResolver.resolveAccountCredentials(
        explicitKey,
        keyManager,
        false,
        ['token:treasury'],
      );
      return resolved;
    }

    const treasuryAccountInfo = await api.mirror.getAccount(treasuryAccountId);
    if (!treasuryAccountInfo) {
      throw new ValidationError(
        `Account ${treasuryAccountId} not found on mirror node`,
        { context: { treasuryAccountId } },
      );
    }

    const kmsRecord = api.kms.findByPublicKey(
      treasuryAccountInfo.accountPublicKey,
    );
    if (!kmsRecord) {
      throw new ValidationError(
        'Treasury key not found in key manager. Provide --current-treasury-key.',
        { context: { treasuryAccountId } },
      );
    }

    return {
      accountId: treasuryAccountInfo.accountId,
      keyRefId: kmsRecord.keyRefId,
      publicKey: kmsRecord.publicKey,
    };
  }
}

export async function tokenUpdate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenUpdateCommand().execute(args);
}
