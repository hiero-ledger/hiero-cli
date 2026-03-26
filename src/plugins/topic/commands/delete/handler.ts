import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TopicData } from '@/plugins/topic/schema';
import type { TopicDeleteOutput } from './output';
import type {
  DeleteTopicBuildTransactionResult,
  DeleteTopicExecuteTransactionResult,
  DeleteTopicNormalisedParams,
  DeleteTopicSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TopicHelper } from '@/plugins/topic/topic-helper';
import {
  extractPublicKeysFromMirrorNodeKey,
  getEffectiveAdminKeyRequirement,
} from '@/plugins/topic/utils/extract-public-keys';
import {
  buildAdminPublicKeySet,
  resolveSigningKeyRefsFromExplicitCredentials,
} from '@/plugins/topic/utils/topic-delete-admin-keys';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicDeleteInputSchema } from './input';

export const TOPIC_DELETE_COMMAND_NAME = 'topic_delete';

export class TopicDeleteCommand extends BaseTransactionCommand<
  DeleteTopicNormalisedParams,
  DeleteTopicBuildTransactionResult,
  DeleteTopicSignTransactionResult,
  DeleteTopicExecuteTransactionResult
> {
  constructor() {
    super(TOPIC_DELETE_COMMAND_NAME);
  }

  private warnIgnoredTopicDeleteAdminKeys(
    logger: Logger,
    ignoredKeyRefIds: string[],
  ): void {
    for (const keyRefId of ignoredKeyRefIds) {
      logger.warn(
        `Admin key ${keyRefId} does not match the topic admin key on the network (mirror node) and was ignored`,
      );
    }
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = TopicDeleteInputSchema.parse(args.args);
    if (validArgs.stateOnly) {
      return this.executeStateOnlyDelete(args);
    }
    return super.execute(args);
  }

  private async executeStateOnlyDelete(
    args: CommandHandlerArgs,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const params = await this.resolveStateTopicForDelete(args);
    const topicHelper = new TopicHelper(api.alias, api.state, logger);
    const removedAliases = topicHelper.removeTopicFromLocalState(
      params.topicToDelete,
      params.network,
    );

    const outputData: TopicDeleteOutput = {
      deletedTopic: {
        name: params.topicToDelete.name,
        topicId: params.topicToDelete.topicId,
      },
      removedAliases,
      network: params.network,
      stateOnly: true,
    };

    return { result: outputData };
  }

  private async resolveStateTopicForDelete(
    args: CommandHandlerArgs,
  ): Promise<DeleteTopicNormalisedParams> {
    const { api, logger } = args;
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const validArgs = TopicDeleteInputSchema.parse(args.args);
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const network = api.network.getCurrentNetwork();
    let key: string;

    if (isEntityId) {
      key = composeKey(network, topicRef);
    } else {
      const topicAlias = api.alias.resolveOrThrow(
        topicRef,
        AliasType.Topic,
        network,
      );
      if (!topicAlias.entityId) {
        throw new NotFoundError(
          `Alias for topic ${topicRef} is missing entity ID in its record`,
        );
      }
      key = composeKey(network, topicAlias.entityId);
    }

    const topicToDelete = topicState.loadTopic(key);
    if (!topicToDelete) {
      throw new NotFoundError(`Topic with identifier '${topicRef}' not found`);
    }

    return {
      topicRef,
      network,
      key,
      topicToDelete,
      stateOnly: true,
      signingKeyRefIds: [],
    };
  }

  private resolveTopicEntityId(
    args: CommandHandlerArgs,
    topicRef: string,
    isEntityId: boolean,
  ): string {
    const { api } = args;
    const network = api.network.getCurrentNetwork();
    if (isEntityId) {
      return EntityIdSchema.parse(topicRef);
    }
    const topicAlias = api.alias.resolveOrThrow(
      topicRef,
      AliasType.Topic,
      network,
    );
    if (!topicAlias.entityId) {
      throw new NotFoundError(
        `Alias for topic ${topicRef} is missing entity ID in its record`,
      );
    }
    return topicAlias.entityId;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteTopicNormalisedParams> {
    const { api, logger } = args;
    const validArgs = TopicDeleteInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    if (validArgs.adminKey.length === 0) {
      throw new ValidationError('No --admin-key was provided.');
    }

    const topicEntityId = this.resolveTopicEntityId(args, topicRef, isEntityId);
    const key = composeKey(network, topicEntityId);

    const loaded = topicState.loadTopic(key);

    const topicInfo = await api.mirror.getTopicInfo(topicEntityId);
    if (topicInfo.deleted) {
      throw new ValidationError(
        'Topic is already deleted on the network (mirror node).',
      );
    }

    const extracted = extractPublicKeysFromMirrorNodeKey(topicInfo.admin_key);
    const requirement = getEffectiveAdminKeyRequirement(extracted);
    if (requirement.adminPublicKeys.length === 0) {
      throw new ValidationError(
        'Topic has no admin key on the network; it cannot be deleted with TopicDeleteTransaction.',
      );
    }

    const adminPublicKeysSet = buildAdminPublicKeySet(
      requirement.adminPublicKeys,
    );

    const adminKeys = await Promise.all(
      validArgs.adminKey.map((cred) =>
        api.keyResolver.resolveSigningKey(cred, keyManager, false, [
          'topic:admin',
        ]),
      ),
    );
    const explicitFromKeys = resolveSigningKeyRefsFromExplicitCredentials(
      adminKeys,
      adminPublicKeysSet,
      requirement.requiredSignatures,
    );
    this.warnIgnoredTopicDeleteAdminKeys(
      logger,
      explicitFromKeys.ignoredKeyRefIds,
    );
    const signingKeyRefIds = explicitFromKeys.signingKeyRefIds;

    if (loaded) {
      const topicToDelete: TopicData = {
        ...loaded,
        adminKeyRefIds: signingKeyRefIds,
        adminKeyThreshold: requirement.requiredSignatures,
      };

      return {
        topicRef,
        network,
        key,
        topicToDelete,
        stateOnly: false,
        signingKeyRefIds,
      };
    }

    const entityId = EntityIdSchema.parse(topicEntityId);

    const topicToDelete: TopicData = {
      topicId: entityId,
      network,
      adminKeyRefIds: signingKeyRefIds,
      adminKeyThreshold: requirement.requiredSignatures,
      submitKeyRefIds: [],
      submitKeyThreshold: 0,
      createdAt: new Date().toISOString(),
    };

    return {
      topicRef,
      network,
      key,
      topicToDelete,
      stateOnly: false,
      signingKeyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteTopicNormalisedParams,
  ): Promise<DeleteTopicBuildTransactionResult> {
    const { api } = args;
    const result = api.topic.deleteTopic({
      topicId: normalisedParams.topicToDelete.topicId,
    });
    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteTopicNormalisedParams,
    buildTransactionResult: DeleteTopicBuildTransactionResult,
  ): Promise<DeleteTopicSignTransactionResult> {
    const { api } = args;
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.signingKeyRefIds,
    );

    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: DeleteTopicNormalisedParams,
    _buildTransactionResult: DeleteTopicBuildTransactionResult,
    signTransactionResult: DeleteTopicSignTransactionResult,
  ): Promise<DeleteTopicExecuteTransactionResult> {
    const { api } = args;
    return api.txExecute.execute(signTransactionResult.signedTransaction);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: DeleteTopicNormalisedParams,
    _buildTransactionResult: DeleteTopicBuildTransactionResult,
    _signTransactionResult: DeleteTopicSignTransactionResult,
    executeTransactionResult: DeleteTopicExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;

    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to delete topic (txId: ${executeTransactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: executeTransactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }

    const topicHelper = new TopicHelper(api.alias, api.state, logger);
    const removedAliases = topicHelper.removeTopicFromLocalState(
      normalisedParams.topicToDelete,
      normalisedParams.network,
    );

    const outputData: TopicDeleteOutput = {
      deletedTopic: {
        name: normalisedParams.topicToDelete.name,
        topicId: normalisedParams.topicToDelete.topicId,
      },
      removedAliases,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId,
      stateOnly: false,
    };

    return { result: outputData };
  }
}

export async function topicDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TopicDeleteCommand().execute(args);
}
