import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TopicData } from '@/plugins/topic/schema';
import type { TopicStateService } from '@/plugins/topic/services/topic-state.service.interface';
import type { TopicImportOutput } from './output';
import type { ImportTopicNormalisedParams } from './types';

import { ValidationError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { extractPublicKeysFromMirrorNodeKey } from '@/core/utils/extract-public-keys';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import { matchPublicKeysToKmsRefIds } from '@/core/utils/match-keys-to-kms';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

import { TopicImportInputSchema } from './input';

export class TopicImportCommand implements Command {
  constructor(private readonly topicState: TopicStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = TopicImportInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const normalisedParams: ImportTopicNormalisedParams = {
      topicId: validArgs.topic,
      alias: validArgs.name,
      network,
    };

    if (normalisedParams.alias) {
      api.alias.availableOrThrow(
        normalisedParams.alias,
        normalisedParams.network,
      );
    }

    const topicInfo = await api.mirror.getTopicInfo(normalisedParams.topicId);
    const key = composeKey(normalisedParams.network, normalisedParams.topicId);

    api.logger.info(`Importing topic: ${key} (${normalisedParams.topicId})`);

    if (this.topicState.loadTopic(key)) {
      throw new ValidationError(
        `Topic with ID '${normalisedParams.topicId}' already exists in state`,
      );
    }

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Topic,
        network: normalisedParams.network,
        entityId: normalisedParams.topicId,
        createdAt: new Date().toISOString(),
      });
    }

    const createdAt = hederaTimestampToIso(topicInfo.created_timestamp);

    const adminKeysExtracted = extractPublicKeysFromMirrorNodeKey(
      topicInfo.admin_key,
    );
    const submitKeysExtracted = extractPublicKeysFromMirrorNodeKey(
      topicInfo.submit_key,
    );

    const findByPublicKey = (publicKey: string) =>
      api.kms.findByPublicKey(publicKey);

    const adminKeyRefIds = matchPublicKeysToKmsRefIds(
      adminKeysExtracted.publicKeys,
      findByPublicKey,
    );
    const submitKeyRefIds = matchPublicKeysToKmsRefIds(
      submitKeysExtracted.publicKeys,
      findByPublicKey,
    );

    const topicData: TopicData = {
      name: normalisedParams.alias,
      topicId: normalisedParams.topicId,
      memo: topicInfo.memo || '(No memo)',
      adminKeyRefIds,
      submitKeyRefIds,
      adminKeyThreshold: adminKeysExtracted.threshold,
      submitKeyThreshold: submitKeysExtracted.threshold,
      network: normalisedParams.network,
      createdAt,
    };

    this.topicState.saveTopic(key, topicData);

    const result: TopicImportOutput = {
      topicId: normalisedParams.topicId,
      name: topicData.name,
      network: normalisedParams.network,
      memo: topicInfo.memo || undefined,
      adminKeyPresent: Boolean(topicInfo.admin_key),
      submitKeyPresent: Boolean(topicInfo.submit_key),
    };

    return { result };
  }
}

export async function topicImport(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger, state } = args.api;
  const topicState = new TopicStateServiceImpl(state, logger);

  return new TopicImportCommand(topicState).execute(args);
}
