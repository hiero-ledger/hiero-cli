import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TopicData } from '@/plugins/topic/schema';
import type { TopicCleanupService } from '@/plugins/topic/services/topic-cleanup.service.interface';
import type { TopicResolutionService } from '@/plugins/topic/services/topic-resolution.service.interface';
import type { TopicStateService } from '@/plugins/topic/services/topic-state.service.interface';
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
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TopicAliasServiceImpl } from '@/plugins/topic/services/topic-alias.service';
import { TopicCleanupServiceImpl } from '@/plugins/topic/services/topic-cleanup.service';
import { TopicResolutionServiceImpl } from '@/plugins/topic/services/topic-resolution.service';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

import { TopicDeleteInputSchema } from './input';

export const TOPIC_DELETE_COMMAND_NAME = 'topic_delete';

export class TopicDeleteCommand extends BaseTransactionCommand<
  DeleteTopicNormalisedParams,
  DeleteTopicBuildTransactionResult,
  DeleteTopicSignTransactionResult,
  DeleteTopicExecuteTransactionResult
> {
  constructor(
    private readonly topicState: TopicStateService,
    private readonly topicCleanup: TopicCleanupService,
    private readonly topicResolution: TopicResolutionService,
  ) {
    super(TOPIC_DELETE_COMMAND_NAME);
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
    const params = await this.resolveStateTopicForDelete(args);
    const removedAliases = this.topicCleanup.removeTopicFromLocalState(
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
    const { api } = args;
    const validArgs = TopicDeleteInputSchema.parse(args.args);
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const network = api.network.getCurrentNetwork();
    let key: string;

    if (isEntityId) {
      key = composeKey(network, topicRef);
    } else {
      const topicEntityId = this.topicResolution.resolveTopicId(
        topicRef,
        network,
      );
      key = composeKey(network, topicEntityId);
    }

    const topicToDelete = this.topicState.loadTopic(key);
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
    _args: CommandHandlerArgs,
    topicRef: string,
    isEntityId: boolean,
    network: DeleteTopicNormalisedParams['network'],
  ): string {
    if (isEntityId) {
      return EntityIdSchema.parse(topicRef);
    }
    return this.topicResolution.resolveTopicId(topicRef, network);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteTopicNormalisedParams> {
    const { api } = args;
    const validArgs = TopicDeleteInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const topicEntityId = this.resolveTopicEntityId(
      args,
      topicRef,
      isEntityId,
      network,
    );
    const key = composeKey(network, topicEntityId);

    const loaded = this.topicState.loadTopic(key);

    const topicInfo = await api.mirror.getTopicInfo(topicEntityId);
    if (topicInfo.deleted) {
      throw new ValidationError(
        'Topic is already deleted on the network (mirror node).',
      );
    }

    const { keyRefIds: signingKeyRefIds, requiredSignatures } =
      await api.keyResolver.resolveSigningKeys({
        mirrorRoleKey: topicInfo.admin_key,
        explicitCredentials: validArgs.adminKey,
        keyManager,
        signingKeyLabels: ['topic:admin'],
        emptyMirrorRoleKeyMessage:
          'Topic has no admin key on the network; it cannot be deleted with TopicDeleteTransaction.',
        insufficientKmsMatchesMessage:
          'Not enough admin key(s) found in key manager for this topic. Provide --admin-key.',
        validationErrorOptions: { context: { topicId: topicInfo.topic_id } },
      });

    if (loaded) {
      const topicToDelete: TopicData = {
        ...loaded,
        adminKeyRefIds: signingKeyRefIds,
        adminKeyThreshold: requiredSignatures,
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
      adminKeyThreshold: requiredSignatures,
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
    return {
      transactionResult: await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      ),
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: DeleteTopicNormalisedParams,
    _buildTransactionResult: DeleteTopicBuildTransactionResult,
    _signTransactionResult: DeleteTopicSignTransactionResult,
    executeTransactionResult: DeleteTopicExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { transactionResult } = executeTransactionResult;

    if (!transactionResult.success) {
      throw new TransactionError(
        `Failed to delete topic (txId: ${transactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: transactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }

    const removedAliases = this.topicCleanup.removeTopicFromLocalState(
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
      transactionId: transactionResult.transactionId,
      stateOnly: false,
    };

    return { result: outputData };
  }
}

export async function topicDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { alias } = args.api;
  const topicState = new TopicStateServiceImpl(
    args.api.state,
    args.api.logger,
    args.api.receipt,
    args.api.alias,
    new TopicAliasServiceImpl(args.api.alias, args.api.logger),
  );
  const topicCleanup = new TopicCleanupServiceImpl(
    alias,
    topicState,
    args.api.logger,
  );
  const topicResolution = new TopicResolutionServiceImpl(alias);

  return new TopicDeleteCommand(
    topicState,
    topicCleanup,
    topicResolution,
  ).execute(args);
}
