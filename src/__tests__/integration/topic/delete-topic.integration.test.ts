import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicCreateOutput } from '@/plugins/topic/commands/create';
import type { TopicDeleteOutput } from '@/plugins/topic/commands/delete';
import type { TopicListOutput } from '@/plugins/topic/commands/list';

import '@/core/utils/json-serialize';

import { MOCK_NONEXISTENT_ENTITY_ID } from '@/__tests__/mocks/fixtures';
import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi, NotFoundError } from '@/core';
import { topicCreate, topicDelete, topicList } from '@/plugins/topic';

describe('Delete Topic Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });

  describe('Valid Delete Topic Scenarios', () => {
    it('should delete topic by name and verify with list method', async () => {
      const createTopicArgs: Record<string, unknown> = {
        name: 'topic-to-be-deleted',
      };
      const createTopicResult = await topicCreate({
        args: createTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createTopicOutput = createTopicResult.result as TopicCreateOutput;
      expect(createTopicOutput.name).toBe('topic-to-be-deleted');
      expect(createTopicOutput.network).toBe(network);

      const listTopicArgs: Record<string, unknown> = {
        network: network,
      };
      const listTopicResult = await topicList({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listTopicOutput = listTopicResult.result as TopicListOutput;
      const topicBeforeDelete = listTopicOutput.topics.find(
        (t) => t.name === 'topic-to-be-deleted',
      );
      expect(topicBeforeDelete).not.toBeUndefined();
      expect(topicBeforeDelete?.topicId).toBe(createTopicOutput.topicId);

      const deleteTopicArgs: Record<string, unknown> = {
        topic: 'topic-to-be-deleted',
        stateOnly: true,
      };
      const deleteTopicResult = await topicDelete({
        args: deleteTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const deleteTopicOutput = deleteTopicResult.result as TopicDeleteOutput;
      expect(deleteTopicOutput.deletedTopic.name).toBe('topic-to-be-deleted');
      expect(deleteTopicOutput.deletedTopic.topicId).toBe(
        createTopicOutput.topicId,
      );
      expect(deleteTopicOutput.network).toBe(network);

      const listAfterDeleteResult = await topicList({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listAfterDeleteOutput =
        listAfterDeleteResult.result as TopicListOutput;
      const topicAfterDelete = listAfterDeleteOutput.topics.find(
        (t) => t.name === 'topic-to-be-deleted',
      );
      expect(topicAfterDelete).toBeUndefined();
    });

    it('should delete topic by topicId and verify with list method', async () => {
      const createTopicArgs: Record<string, unknown> = {
        name: 'topic-to-delete-by-id',
      };
      const createTopicResult = await topicCreate({
        args: createTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createTopicOutput = createTopicResult.result as TopicCreateOutput;
      expect(createTopicOutput.name).toBe('topic-to-delete-by-id');

      const deleteTopicArgs: Record<string, unknown> = {
        topic: createTopicOutput.topicId,
        stateOnly: true,
      };
      const deleteTopicResult = await topicDelete({
        args: deleteTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const deleteTopicOutput = deleteTopicResult.result as TopicDeleteOutput;
      expect(deleteTopicOutput.deletedTopic.topicId).toBe(
        createTopicOutput.topicId,
      );
      expect(deleteTopicOutput.deletedTopic.name).toBe('topic-to-delete-by-id');

      const listTopicArgs: Record<string, unknown> = {
        network: network,
      };
      const listAfterDeleteResult = await topicList({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listAfterDeleteOutput =
        listAfterDeleteResult.result as TopicListOutput;
      const topicAfterDelete = listAfterDeleteOutput.topics.find(
        (t) => t.topicId === createTopicOutput.topicId,
      );
      expect(topicAfterDelete).toBeUndefined();
    });
  });

  describe('Invalid Delete Topic Scenarios', () => {
    it('should fail when deleting non-existent topic by name', async () => {
      await expect(
        topicDelete({
          args: { topic: 'non-existent-topic-name' },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should fail when deleting non-existent topic by topicId', async () => {
      await expect(
        topicDelete({
          args: { topic: MOCK_NONEXISTENT_ENTITY_ID },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow(
        `Topic with identifier '${MOCK_NONEXISTENT_ENTITY_ID}' not found`,
      );
    });
  });
});
