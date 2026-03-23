import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
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
import { KeySchema } from '@/core/schemas';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/plugins/topic/utils/keys-to-hedera-key';
import { resolveTopicId } from '@/plugins/topic/utils/topicResolver';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicUpdateInputSchema } from './input';

export const TOPIC_UPDATE_COMMAND_NAME = 'topic_update';

const NULL_TOKEN = 'null';

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
    const existingTopicData = topicState.loadTopic(stateKey);

    if (!existingTopicData) {
      throw new NotFoundError(
        `Topic "${validArgs.topic}" not found in local state for network ${network}`,
      );
    }

    const memo = validArgs.memo === NULL_TOKEN ? null : validArgs.memo;

    const isSubmitKeyClear =
      validArgs.submitKey.length === 1 && validArgs.submitKey[0] === NULL_TOKEN;

    const autoRenewAccountId =
      validArgs.autoRenewAccount === NULL_TOKEN
        ? null
        : validArgs.autoRenewAccount;

    const hasAdminKey = existingTopicData.adminKeyRefIds.length > 0;
    const hasOnlyExpirationTime =
      validArgs.expirationTime !== undefined &&
      memo === undefined &&
      validArgs.adminKey.length === 0 &&
      !isSubmitKeyClear &&
      validArgs.submitKey.length === 0 &&
      autoRenewAccountId === undefined &&
      validArgs.autoRenewPeriod === undefined;

    const isExpirationOnlyUpdate = !hasAdminKey && hasOnlyExpirationTime;

    if (!hasAdminKey && !hasOnlyExpirationTime) {
      throw new ValidationError(
        'Cannot update immutable topic (no admin key). Only expirationTime can be extended.',
      );
    }

    const keyManagerArg = validArgs.keyManager;
    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const adminKeyArgs = validArgs.adminKey;
    const submitKeyRawArgs = isSubmitKeyClear
      ? []
      : validArgs.submitKey.filter((k) => k !== NULL_TOKEN);
    const submitKeyArgs = submitKeyRawArgs.map((raw) => KeySchema.parse(raw));

    const newAdminKeys =
      adminKeyArgs.length > 0
        ? await Promise.all(
            adminKeyArgs.map((cred) =>
              api.keyResolver.resolveSigningKey(cred, keyManager, false, [
                'topic:admin',
              ]),
            ),
          )
        : undefined;

    const newSubmitKeys = isSubmitKeyClear
      ? null
      : submitKeyArgs.length > 0
        ? await Promise.all(
            submitKeyArgs.map((cred) =>
              api.keyResolver.getPublicKey(cred, keyManager, false, [
                'topic:submit',
              ]),
            ),
          )
        : undefined;

    const adminThreshold =
      existingTopicData.adminKeyThreshold ||
      existingTopicData.adminKeyRefIds.length;
    const currentAdminKeyRefIds = existingTopicData.adminKeyRefIds.slice(
      0,
      adminThreshold,
    );

    logger.info(`Updating topic ${topicId} on ${network}`);

    return {
      topicId,
      stateKey,
      network,
      keyManager,
      existingTopicData,
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

    const adminKey = normalisedParams.newAdminKeys
      ? toHederaKey(
          normalisedParams.newAdminKeys,
          normalisedParams.newAdminKeyThreshold ??
            normalisedParams.newAdminKeys.length,
        )
      : undefined;

    const submitKey =
      normalisedParams.newSubmitKeys === null
        ? null
        : normalisedParams.newSubmitKeys
          ? toHederaKey(
              normalisedParams.newSubmitKeys,
              normalisedParams.newSubmitKeyThreshold ??
                normalisedParams.newSubmitKeys.length,
            )
          : undefined;

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

    const updatedMemo =
      normalisedParams.memo === null
        ? undefined
        : normalisedParams.memo !== undefined
          ? normalisedParams.memo
          : existing.memo;
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

    const updatedSubmitKeyRefIds =
      normalisedParams.newSubmitKeys === null
        ? []
        : normalisedParams.newSubmitKeys
          ? normalisedParams.newSubmitKeys.map((k) => k.keyRefId)
          : existing.submitKeyRefIds;
    const updatedSubmitKeyThreshold =
      normalisedParams.newSubmitKeys === null
        ? 0
        : normalisedParams.newSubmitKeys
          ? (normalisedParams.newSubmitKeyThreshold ??
            normalisedParams.newSubmitKeys.length)
          : existing.submitKeyThreshold;
    if (normalisedParams.newSubmitKeys !== undefined) {
      updatedFields.push(
        normalisedParams.newSubmitKeys === null
          ? 'submitKey (cleared)'
          : 'submitKey',
      );
    }

    const updatedAutoRenewAccount =
      normalisedParams.autoRenewAccountId === null
        ? undefined
        : (normalisedParams.autoRenewAccountId ?? existing.autoRenewAccount);
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
