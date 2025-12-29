import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateTopicOutput } from '@/plugins/topic/commands/create';
import type { FindMessagesOutput } from '@/plugins/topic/commands/find-message';
import type { ListTopicsOutput } from '@/plugins/topic/commands/list';
import type { SubmitMessageOutput } from '@/plugins/topic/commands/submit-message';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { Status } from '@/core/shared/constants';
import {
  createTopic,
  findMessage,
  listTopics,
  submitMessage,
} from '@/plugins/topic';

describe('Topic Messages Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a topic and submit message and then find it', async () => {
    const createTopicArgs: Record<string, unknown> = {
      name: 'test-topic-submit',
    };
    const createTopicResult = await createTopic({
      args: createTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(createTopicResult.status).toBe(Status.Success);
    const createTopicOutput: CreateTopicOutput = JSON.parse(
      createTopicResult.outputJson!,
    );
    expect(createTopicOutput.name).toBe('test-topic-submit');
    expect(createTopicOutput.network).toBe(network);
    expect(createTopicOutput.adminKeyPresent).toBe(false);
    expect(createTopicOutput.submitKeyPresent).toBe(false);

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
    expect(listTopicResult.status).toBe(Status.Success);
    const listTopicOutput: ListTopicsOutput = JSON.parse(
      listTopicResult.outputJson!,
    );
    const topic = listTopicOutput.topics.find(
      (topic) => topic.name == 'test-topic-submit',
    );
    expect(topic).not.toBeNull();
    expect(topic?.name).toBe('test-topic-submit');
    expect(topic?.network).toBe(network);
    expect(topic?.adminKeyPresent).toBe(false);
    expect(topic?.submitKeyPresent).toBe(false);
    expect(topic?.createdAt).toBe(createTopicOutput.createdAt);
    expect(topic?.topicId).toBe(createTopicOutput.topicId);

    for (let i = 0; i < 10; i++) {
      const topicMessageSubmitArgs: Record<string, unknown> = {
        topic: createTopicOutput.topicId,
        message: `Test message ${i + 1}`,
      };
      const submitMessageResult = await submitMessage({
        args: topicMessageSubmitArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      expect(submitMessageResult.status).toBe(Status.Success);
      const submitMessageOutput: SubmitMessageOutput = JSON.parse(
        submitMessageResult.outputJson!,
      );
      expect(submitMessageOutput.topicId).toBe(createTopicOutput.topicId);
      expect(submitMessageOutput.message).toBe(`Test message ${i + 1}`);
    }

    await delay(5000);

    const findMessageEqArgs: Record<string, any> = {
      topic: createTopicOutput.topicId,
      sequenceEq: 3,
    };
    const findMessageEqResult = await findMessage({
      args: findMessageEqArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(findMessageEqResult.status).toBe(Status.Success);
    const findMessageEqOutput: FindMessagesOutput = JSON.parse(
      findMessageEqResult.outputJson!,
    );
    expect(findMessageEqOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageEqOutput.messages?.at(0)?.message).toBe(`Test message 3`);

    const findMessageGtArgs: Record<string, any> = {
      topic: createTopicOutput.topicId,
      sequenceGt: 7,
    };
    const findMessageGtResult = await findMessage({
      args: findMessageGtArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(findMessageGtResult.status).toBe(Status.Success);
    const findMessageGtOutput: FindMessagesOutput = JSON.parse(
      findMessageGtResult.outputJson!,
    );
    expect(findMessageGtOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageGtOutput.messages.length).toBe(3);

    const findMessageGteArgs: Record<string, any> = {
      topic: createTopicOutput.topicId,
      sequenceGte: 7,
    };
    const findMessageGteResult = await findMessage({
      args: findMessageGteArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(findMessageGteResult.status).toBe(Status.Success);
    const findMessageGteOutput: FindMessagesOutput = JSON.parse(
      findMessageGteResult.outputJson!,
    );
    expect(findMessageGteOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageGteOutput.messages.length).toBe(4);

    const findMessageLtArgs: Record<string, any> = {
      topic: createTopicOutput.topicId,
      sequenceLt: 4,
    };
    const findMessageLtResult = await findMessage({
      args: findMessageLtArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(findMessageLtResult.status).toBe(Status.Success);
    const findMessageLtOutput: FindMessagesOutput = JSON.parse(
      findMessageLtResult.outputJson!,
    );
    expect(findMessageLtOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageLtOutput.messages.length).toBe(3);

    const findMessageLteArgs: Record<string, any> = {
      topic: createTopicOutput.topicId,
      sequenceLte: 4,
    };
    const findMessageLteResult = await findMessage({
      args: findMessageLteArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(findMessageLteResult.status).toBe(Status.Success);
    const findMessageLteOutput: FindMessagesOutput = JSON.parse(
      findMessageLteResult.outputJson!,
    );
    expect(findMessageLteOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageLteOutput.messages.length).toBe(4);
  });
});
