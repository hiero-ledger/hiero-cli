import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TopicData } from '@/plugins/topic/schema';
import type { TopicImportOutput } from './output';
import type { ImportTopicNormalisedParams } from './types';

import { ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import {
  extractPublicKeysFromMirrorNodeKey,
  matchKeysWithKms,
} from '@/plugins/topic/utils/extract-public-keys';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicImportInputSchema } from './input';

export class TopicImportCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const topicState = new ZustandTopicStateHelper(api.state, logger);
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

    logger.info(`Importing topic: ${key} (${normalisedParams.topicId})`);

    if (topicState.loadTopic(key)) {
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

    const adminKeyRefIds = matchKeysWithKms(
      adminKeysExtracted?.publicKeys ?? [],
      api.kms,
    );
    const submitKeyRefIds = matchKeysWithKms(
      submitKeysExtracted?.publicKeys ?? [],
      api.kms,
    );

    const topicData: TopicData = {
      name: normalisedParams.alias,
      topicId: normalisedParams.topicId,
      memo: topicInfo.memo || '(No memo)',
      adminKeyRefIds: adminKeyRefIds.length ? adminKeyRefIds : undefined,
      submitKeyRefIds: submitKeyRefIds.length ? submitKeyRefIds : undefined,
      adminKeyThreshold: adminKeysExtracted?.threshold,
      submitKeyThreshold: submitKeysExtracted?.threshold,
      network: normalisedParams.network,
      createdAt,
    };

    topicState.saveTopic(key, topicData);

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
  return new TopicImportCommand().execute(args);
}
