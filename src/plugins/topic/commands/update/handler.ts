import type { Key } from '@hiero-ledger/sdk';
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { TopicUpdateOutput } from './output';
import type {
  UpdateTopicBuildTransactionResult,
  UpdateTopicExecuteTransactionResult,
  UpdateTopicNormalisedParams,
  UpdateTopicSignTransactionResult,
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
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { resolveFieldUpdate } from '@/core/utils/resolve-field-update';
import { resolveTopicId } from '@/plugins/topic/utils/topicResolver';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicUpdateInputSchema } from './input';

export const TOPIC_UPDATE_COMMAND_NAME = 'topic_update';

export class TopicUpdateCommand extends BaseTransactionCommand<
  UpdateTopicNormalisedParams,
  UpdateTopicBuildTransactionResult,
  UpdateTopicSignTransactionResult,
  UpdateTopicExecuteTransactionResult
> {
  constructor() {
    super(TOPIC_UPDATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<UpdateTopicNormalisedParams> {
    const { api, logger } = args;
    const validArgs = TopicUpdateInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const topicId = resolveTopicId(validArgs.topic, api.alias, network);

    const stateKey = composeKey(network, topicId);
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const storedTopicData = topicState.loadTopic(stateKey);
    if (!storedTopicData) {
      throw new NotFoundError(
        `Topic "${validArgs.topic}" not found in local state for network ${network}`,
      );
    }

    const topicInfo = await api.mirror.getTopicInfo(topicId);

    const memo = validArgs.memo === NULL_TOKEN ? null : validArgs.memo;
    const autoRenewAccountId =
      validArgs.autoRenewAccount === NULL_TOKEN
        ? null
        : validArgs.autoRenewAccount;

    const submitKeyInput =
      validArgs.submitKey === NULL_TOKEN ? null : validArgs.submitKey;
    const isSubmitKeyClear = submitKeyInput === null;
    const submitKeyCredentials = isSubmitKeyClear
      ? []
      : (submitKeyInput as Credential[]);

    const hasAdminKey = !!topicInfo.admin_key;
    const hasOnlyExpirationTime =
      validArgs.expirationTime !== undefined &&
      memo === undefined &&
      validArgs.adminKey.length === 0 &&
      !isSubmitKeyClear &&
      submitKeyCredentials.length === 0 &&
      autoRenewAccountId === undefined &&
      validArgs.autoRenewPeriod === undefined;

    if (!hasAdminKey && !hasOnlyExpirationTime) {
      throw new ValidationError(
        'Cannot update immutable topic (no admin key). Only expirationTime can be extended.',
      );
    }

    const keyManagerArg = validArgs.keyManager;
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    let newAdminKeys: ResolvedPublicKey[] | undefined;
    if (validArgs.adminKey.length > 0) {
      newAdminKeys = await Promise.all(
        validArgs.adminKey.map((cred) =>
          api.keyResolver.resolveSigningKey(cred, keyManager, false, [
            'topic:admin',
          ]),
        ),
      );
    }

    let newSubmitKeys: ResolvedPublicKey[] | null | undefined;
    if (isSubmitKeyClear) {
      newSubmitKeys = null;
    } else if (submitKeyCredentials.length > 0) {
      newSubmitKeys = await Promise.all(
        submitKeyCredentials.map((cred) =>
          api.keyResolver.getPublicKey(cred, keyManager, false, [
            'topic:submit',
          ]),
        ),
      );
    }

    const isExpirationOnlyUpdate = !hasAdminKey && hasOnlyExpirationTime;

    let currentAdminKeyRefIds: string[] = [];
    if (hasAdminKey && !isExpirationOnlyUpdate) {
      const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
        mirrorRoleKey: topicInfo.admin_key,
        explicitCredentials: [],
        keyManager,
        signingKeyLabels: ['topic:admin'],
        emptyMirrorRoleKeyMessage: 'Topic has no admin key on the network',
        insufficientKmsMatchesMessage:
          'Not enough admin key(s) found in key manager for this topic.',
        validationErrorOptions: { context: { topicId } },
      });
      currentAdminKeyRefIds = keyRefIds;
    }

    logger.info(`Updating topic ${topicId} on ${network}`);

    return {
      topicId,
      stateKey,
      network,
      keyManager,
      existingTopicData: storedTopicData,
      memo,
      newAdminKeys,
      newSubmitKeys,
      newAdminKeyThreshold: validArgs.adminKeyThreshold,
      newSubmitKeyThreshold: validArgs.submitKeyThreshold,
      autoRenewAccountId,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      expirationTime: validArgs.expirationTime,
      currentAdminKeyRefIds,
      isExpirationOnlyUpdate,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateTopicNormalisedParams,
  ): Promise<UpdateTopicBuildTransactionResult> {
    const { api } = args;

    let adminKey: Key | undefined;
    if (normalisedParams.newAdminKeys !== undefined) {
      adminKey = toHederaKey(
        normalisedParams.newAdminKeys,
        normalisedParams.newAdminKeyThreshold ??
          normalisedParams.newAdminKeys.length,
      );
    }

    let submitKey: Key | null | undefined;
    if (normalisedParams.newSubmitKeys === null) {
      submitKey = null;
    } else if (normalisedParams.newSubmitKeys !== undefined) {
      submitKey = toHederaKey(
        normalisedParams.newSubmitKeys,
        normalisedParams.newSubmitKeyThreshold ??
          normalisedParams.newSubmitKeys.length,
      );
    }

    const expirationTime = normalisedParams.expirationTime
      ? new Date(normalisedParams.expirationTime)
      : undefined;

    const result = api.topic.updateTopic({
      topicId: normalisedParams.topicId,
      memo: normalisedParams.memo,
      adminKey,
      submitKey,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      autoRenewPeriod: normalisedParams.autoRenewPeriod,
      expirationTime,
    });

    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateTopicNormalisedParams,
    buildTransactionResult: UpdateTopicBuildTransactionResult,
  ): Promise<UpdateTopicSignTransactionResult> {
    const { api } = args;

    const signerKeyRefIds = new Set<string>();

    if (!normalisedParams.isExpirationOnlyUpdate) {
      for (const keyRefId of normalisedParams.currentAdminKeyRefIds) {
        signerKeyRefIds.add(keyRefId);
      }

      if (normalisedParams.newAdminKeys) {
        const threshold =
          normalisedParams.newAdminKeyThreshold ??
          normalisedParams.newAdminKeys.length;
        const newKeyRefs = normalisedParams.newAdminKeys
          .slice(0, threshold)
          .map((k) => k.keyRefId);
        for (const keyRefId of newKeyRefs) {
          signerKeyRefIds.add(keyRefId);
        }
      }
    }

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [...signerKeyRefIds],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: UpdateTopicNormalisedParams,
    _buildTransactionResult: UpdateTopicBuildTransactionResult,
    signTransactionResult: UpdateTopicSignTransactionResult,
  ): Promise<UpdateTopicExecuteTransactionResult> {
    const { api } = args;

    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Failed to update topic (txId: ${result.transactionId})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: UpdateTopicNormalisedParams,
    _buildTransactionResult: UpdateTopicBuildTransactionResult,
    _signTransactionResult: UpdateTopicSignTransactionResult,
    executeTransactionResult: UpdateTopicExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const existing = normalisedParams.existingTopicData;

    const updatedFields: string[] = [];

    const updatedMemo = resolveFieldUpdate(
      normalisedParams.memo,
      existing.memo,
    );
    if (normalisedParams.memo !== undefined) {
      updatedFields.push(
        normalisedParams.memo === null ? 'memo (cleared)' : 'memo',
      );
    }

    const updatedAdminKeyRefIds = normalisedParams.newAdminKeys
      ? normalisedParams.newAdminKeys.map((k) => k.keyRefId)
      : existing.adminKeyRefIds;
    const updatedAdminKeyThreshold = normalisedParams.newAdminKeys
      ? (normalisedParams.newAdminKeyThreshold ??
        normalisedParams.newAdminKeys.length)
      : existing.adminKeyThreshold;
    if (normalisedParams.newAdminKeys) {
      updatedFields.push('adminKey');
    }

    let updatedSubmitKeyRefIds: string[];
    let updatedSubmitKeyThreshold: number;
    if (normalisedParams.newSubmitKeys === null) {
      updatedSubmitKeyRefIds = [];
      updatedSubmitKeyThreshold = 0;
    } else if (normalisedParams.newSubmitKeys !== undefined) {
      updatedSubmitKeyRefIds = normalisedParams.newSubmitKeys.map(
        (k) => k.keyRefId,
      );
      updatedSubmitKeyThreshold =
        normalisedParams.newSubmitKeyThreshold ??
        normalisedParams.newSubmitKeys.length;
    } else {
      updatedSubmitKeyRefIds = existing.submitKeyRefIds;
      updatedSubmitKeyThreshold = existing.submitKeyThreshold;
    }
    if (normalisedParams.newSubmitKeys !== undefined) {
      updatedFields.push(
        normalisedParams.newSubmitKeys === null
          ? 'submitKey (cleared)'
          : 'submitKey',
      );
    }

    const updatedAutoRenewAccount = resolveFieldUpdate(
      normalisedParams.autoRenewAccountId,
      existing.autoRenewAccount,
    );
    if (normalisedParams.autoRenewAccountId !== undefined) {
      updatedFields.push(
        normalisedParams.autoRenewAccountId === null
          ? 'autoRenewAccount (cleared)'
          : 'autoRenewAccount',
      );
    }

    const updatedAutoRenewPeriod =
      normalisedParams.autoRenewPeriod ?? existing.autoRenewPeriod;
    if (normalisedParams.autoRenewPeriod !== undefined) {
      updatedFields.push('autoRenewPeriod');
    }

    const updatedExpirationTime =
      normalisedParams.expirationTime ?? existing.expirationTime;
    if (normalisedParams.expirationTime !== undefined) {
      updatedFields.push('expirationTime');
    }

    const updatedTopicData = {
      name: existing.name,
      topicId: existing.topicId,
      memo: updatedMemo,
      adminKeyRefIds: updatedAdminKeyRefIds,
      submitKeyRefIds: updatedSubmitKeyRefIds,
      adminKeyThreshold: updatedAdminKeyThreshold,
      submitKeyThreshold: updatedSubmitKeyThreshold,
      autoRenewAccount: updatedAutoRenewAccount,
      autoRenewPeriod: updatedAutoRenewPeriod,
      expirationTime: updatedExpirationTime,
      network: existing.network,
      createdAt: existing.createdAt,
    };

    topicState.saveTopic(normalisedParams.stateKey, updatedTopicData);

    const adminKeyCount = updatedAdminKeyRefIds.length;
    const submitKeyCount = updatedSubmitKeyRefIds.length;

    const outputData: TopicUpdateOutput = {
      topicId: existing.topicId,
      name: existing.name,
      network: normalisedParams.network,
      updatedFields,
      memo: updatedMemo,
      adminKeyPresent: adminKeyCount > 0,
      submitKeyPresent: submitKeyCount > 0,
      adminKeyThreshold: updatedAdminKeyThreshold,
      adminKeyCount: adminKeyCount > 1 ? adminKeyCount : undefined,
      submitKeyThreshold: updatedSubmitKeyThreshold,
      submitKeyCount: submitKeyCount > 1 ? submitKeyCount : undefined,
      autoRenewAccount: updatedAutoRenewAccount,
      autoRenewPeriod: updatedAutoRenewPeriod,
      expirationTime: updatedExpirationTime,
      transactionId: executeTransactionResult.transactionId || '',
    };

    return { result: outputData };
  }
}

export async function topicUpdate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TopicUpdateCommand().execute(args);
}
