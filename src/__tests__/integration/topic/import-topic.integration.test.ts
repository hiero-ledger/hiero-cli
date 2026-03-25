import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TopicCreateOutput } from '@/plugins/topic/commands/create';
import type { TopicImportOutput } from '@/plugins/topic/commands/import';
import type { TopicListOutput } from '@/plugins/topic/commands/list';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  topicCreate,
  topicDelete,
  topicImport,
  topicList,
} from '@/plugins/topic';
import { TOPIC_NAMESPACE } from '@/plugins/topic/manifest';

/*
Tests in this suite are only executed when we do not use localnet as selected network due to the fact that
there is a problem with acquiring topic information on Hedera local node when using hiero-local-node or solo to deploy it.
This behavior prevents us from fully testing the topic command's like import here
*/
const describeSuite =
  process.env.NETWORK === SupportedNetwork.LOCALNET ? describe.skip : describe;
describeSuite('Import Topic Integration Tests', () => {
  const TOPIC_NAME = 'TopicImport';

  let coreApi: CoreApi;
  let network: SupportedNetwork;
  let topicId: string;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();

    const createTopicArgs: Record<string, unknown> = {
      name: TOPIC_NAME,
    };
    const createTopicResult = await topicCreate({
      args: createTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const createTopicOutput = createTopicResult.result as TopicCreateOutput;
    topicId = createTopicOutput.topicId;

    const deleteTopicArgs: Record<string, unknown> = {
      topic: topicId,
    };
    await topicDelete({
      args: deleteTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    await delay(5000);
  });

  afterEach(async () => {
    const deleteTopicArgs: Record<string, unknown> = {
      topic: topicId,
    };
    await topicDelete({
      args: deleteTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
  });

  it('should import a topic by ID and verify with list', async () => {
    const importTopicArgs: Record<string, unknown> = {
      topic: topicId,
    };
    const importTopicResult = await topicImport({
      args: importTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const importTopicOutput = importTopicResult.result as TopicImportOutput;
    expect(importTopicOutput.topicId).toBe(topicId);
    expect(importTopicOutput.network).toBe(network);

    const listTopicArgs: Record<string, unknown> = {
      network,
    };
    const listTopicResult = await topicList({
      args: listTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listTopicOutput = listTopicResult.result as TopicListOutput;
    const topic = listTopicOutput.topics.find((t) => t.topicId === topicId);
    expect(topic).not.toBeNull();
    expect(topic?.topicId).toBe(topicId);
    expect(topic?.network).toBe(network);
  });

  it('should import a topic with alias and verify with list', async () => {
    coreApi.state.delete(
      TOPIC_NAMESPACE,
      `${coreApi.network.getCurrentNetwork()}:${topicId}`,
    );

    const alias = `imported-topic-${Date.now()}`;
    const importTopicArgs: Record<string, unknown> = {
      topic: topicId,
      name: alias,
    };
    const importTopicResult = await topicImport({
      args: importTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    const importTopicOutput = importTopicResult.result as TopicImportOutput;
    expect(importTopicOutput.topicId).toBe(topicId);
    expect(importTopicOutput.name).toBe(alias);
    expect(importTopicOutput.network).toBe(network);

    const listTopicArgs: Record<string, unknown> = {
      network,
    };
    const listTopicResult = await topicList({
      args: listTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    const listTopicOutput = listTopicResult.result as TopicListOutput;
    const topic = listTopicOutput.topics.find((t) => t.topicId === topicId);
    expect(topic).not.toBeNull();
    expect(topic?.name).toBe(alias);
  });
});
