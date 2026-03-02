import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateTopicOutput } from '@/plugins/topic/commands/create';
import type { DeleteTopicOutput } from '@/plugins/topic/commands/delete';
import type { ListTopicsOutput } from '@/plugins/topic/commands/list';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { createTopic, deleteTopic, listTopics } from '@/plugins/topic';

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
      const createTopicResult = await createTopic({
        args: createTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createTopicOutput = createTopicResult.result as CreateTopicOutput;
      expect(createTopicOutput.name).toBe('topic-to-be-deleted');
      expect(createTopicOutput.network).toBe(network);

      const listTopicArgs: Record<string, unknown> = {
        network: network,
      };
      const listTopicResult = await listTopics({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listTopicOutput = listTopicResult.result as ListTopicsOutput;
      const topicBeforeDelete = listTopicOutput.topics.find(
        (t) => t.name === 'topic-to-be-deleted',
      );
      expect(topicBeforeDelete).not.toBeUndefined();
      expect(topicBeforeDelete?.topicId).toBe(createTopicOutput.topicId);

      const deleteTopicArgs: Record<string, unknown> = {
        topic: 'topic-to-be-deleted',
      };
      const deleteTopicResult = await deleteTopic({
        args: deleteTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const deleteTopicOutput = deleteTopicResult.result as DeleteTopicOutput;
      expect(deleteTopicOutput.deletedTopic.name).toBe('topic-to-be-deleted');
      expect(deleteTopicOutput.deletedTopic.topicId).toBe(
        createTopicOutput.topicId,
      );
      expect(deleteTopicOutput.network).toBe(network);

      const listAfterDeleteResult = await listTopics({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listAfterDeleteOutput =
        listAfterDeleteResult.result as ListTopicsOutput;
      const topicAfterDelete = listAfterDeleteOutput.topics.find(
        (t) => t.name === 'topic-to-be-deleted',
      );
      expect(topicAfterDelete).toBeUndefined();
    });

    it('should delete topic by topicId and verify with list method', async () => {
      const createTopicArgs: Record<string, unknown> = {
        name: 'topic-to-delete-by-id',
      };
      const createTopicResult = await createTopic({
        args: createTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });

      const createTopicOutput = createTopicResult.result as CreateTopicOutput;
      expect(createTopicOutput.name).toBe('topic-to-delete-by-id');

      const deleteTopicArgs: Record<string, unknown> = {
        topic: createTopicOutput.topicId,
      };
      const deleteTopicResult = await deleteTopic({
        args: deleteTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const deleteTopicOutput = deleteTopicResult.result as DeleteTopicOutput;
      expect(deleteTopicOutput.deletedTopic.topicId).toBe(
        createTopicOutput.topicId,
      );
      expect(deleteTopicOutput.deletedTopic.name).toBe('topic-to-delete-by-id');

      const listTopicArgs: Record<string, unknown> = {
        network: network,
      };
      const listAfterDeleteResult = await listTopics({
        args: listTopicArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const listAfterDeleteOutput =
        listAfterDeleteResult.result as ListTopicsOutput;
      const topicAfterDelete = listAfterDeleteOutput.topics.find(
        (t) => t.topicId === createTopicOutput.topicId,
      );
      expect(topicAfterDelete).toBeUndefined();
    });
  });

  describe('Invalid Delete Topic Scenarios', () => {
    it('should fail when deleting non-existent topic by name', async () => {
      await expect(
        deleteTopic({
          args: { topic: 'non-existent-topic-name' },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow("Topic with name 'non-existent-topic-name' not found");
    });

    it('should fail when deleting non-existent topic by topicId', async () => {
      await expect(
        deleteTopic({
          args: { topic: '0.0.999999999' },
          api: coreApi,
          state: coreApi.state,
          logger: coreApi.logger,
          config: coreApi.config,
        }),
      ).rejects.toThrow("Topic with ID '0.0.999999999' not found");
    });
  });
});
