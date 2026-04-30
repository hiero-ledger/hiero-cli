import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TopicCreateOutput } from '@/plugins/topic/commands/create';
import type { TopicFindMessageOutput } from '@/plugins/topic/commands/find-message';
import type { TopicListOutput } from '@/plugins/topic/commands/list';
import type { TopicSubmitMessageOutput } from '@/plugins/topic/commands/submit-message';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  topicCreate,
  topicFindMessage,
  topicList,
  topicSubmitMessage,
} from '@/plugins/topic';

/*
Tests in this suite are only executed when we do not use localnet as selected network due to the fact that
there is a problem with acquiring topic information on Hedera local node when using hiero-local-node or solo to deploy it.
This behavior prevents us from fully testing the topic commands like submit-message and find-message here.
*/
const describeSuite =
  process.env.NETWORK === SupportedNetwork.LOCALNET ? describe.skip : describe;
describeSuite('Topic Messages Integration Tests', () => {
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
    const createTopicResult = await topicCreate({
      args: createTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const createTopicOutput = createTopicResult.result as TopicCreateOutput;
    expect(createTopicOutput.name).toBe('test-topic-submit');
    expect(createTopicOutput.network).toBe(network);
    expect(createTopicOutput.adminKeyPresent).toBe(false);
    expect(createTopicOutput.submitKeyPresent).toBe(false);

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

    await delay(5000);

    for (let i = 0; i < 10; i++) {
      const topicMessageSubmitArgs: Record<string, unknown> = {
        topic: createTopicOutput.topicId,
        message: `Test message ${i + 1}`,
      };
      const submitMessageResult = await topicSubmitMessage({
        args: topicMessageSubmitArgs,
        api: coreApi,
        state: coreApi.state,
        logger: coreApi.logger,
        config: coreApi.config,
      });
      const submitMessageOutput =
        submitMessageResult.result as TopicSubmitMessageOutput;
      expect(submitMessageOutput.topicId).toBe(createTopicOutput.topicId);
      expect(submitMessageOutput.message).toBe(`Test message ${i + 1}`);
    }

    await delay(5000);

    const findMessageEqArgs: Record<string, string | number> = {
      topic: createTopicOutput.topicId,
      sequenceEq: 3,
    };
    const findMessageEqResult = await topicFindMessage({
      args: findMessageEqArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const findMessageEqOutput =
      findMessageEqResult.result as TopicFindMessageOutput;
    expect(findMessageEqOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageEqOutput.messages?.at(0)?.message).toBe(`Test message 3`);

    const findMessageGtArgs: Record<string, string | number> = {
      topic: createTopicOutput.topicId,
      sequenceGt: 7,
    };
    const findMessageGtResult = await topicFindMessage({
      args: findMessageGtArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const findMessageGtOutput =
      findMessageGtResult.result as TopicFindMessageOutput;
    expect(findMessageGtOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageGtOutput.messages.length).toBe(3);

    const findMessageGteArgs: Record<string, string | number> = {
      topic: createTopicOutput.topicId,
      sequenceGte: 7,
    };
    const findMessageGteResult = await topicFindMessage({
      args: findMessageGteArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const findMessageGteOutput =
      findMessageGteResult.result as TopicFindMessageOutput;
    expect(findMessageGteOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageGteOutput.messages.length).toBe(4);

    const findMessageLtArgs: Record<string, string | number> = {
      topic: createTopicOutput.topicId,
      sequenceLt: 4,
    };
    const findMessageLtResult = await topicFindMessage({
      args: findMessageLtArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const findMessageLtOutput =
      findMessageLtResult.result as TopicFindMessageOutput;
    expect(findMessageLtOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageLtOutput.messages.length).toBe(3);

    const findMessageLteArgs: Record<string, string | number> = {
      topic: createTopicOutput.topicId,
      sequenceLte: 4,
    };
    const findMessageLteResult = await topicFindMessage({
      args: findMessageLteArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const findMessageLteOutput =
      findMessageLteResult.result as TopicFindMessageOutput;
    expect(findMessageLteOutput.topicId).toBe(createTopicOutput.topicId);
    expect(findMessageLteOutput.messages.length).toBe(4);
  }, 120000);
});
