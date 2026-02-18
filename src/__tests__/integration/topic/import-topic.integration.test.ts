import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateTopicOutput } from '@/plugins/topic/commands/create';
import type { ImportTopicOutput } from '@/plugins/topic/commands/import';
import type { ListTopicsOutput } from '@/plugins/topic/commands/list';

import '@/core/utils/json-serialize';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { Status } from '@/core/shared/constants';
import { entityIdToAliasSafeFormat } from '@/core/utils/entity-id-to-alias-format';
import { createTopic, importTopic, listTopics } from '@/plugins/topic';
import { TOPIC_NAMESPACE } from '@/plugins/topic/manifest';

describe('Import Topic Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;
  let topicId: string;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();

    const createTopicArgs: Record<string, unknown> = {
      name: `topic-import-${Date.now()}`,
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
    topicId = createTopicOutput.topicId;

    coreApi.state.delete(TOPIC_NAMESPACE, topicId);

    await delay(5000);
  });

  it('should import a topic by ID and verify with list', async () => {
    const importTopicArgs: Record<string, unknown> = {
      topic: topicId,
    };
    const importTopicResult = await importTopic({
      args: importTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(importTopicResult.status).toBe(Status.Success);
    const importTopicOutput: ImportTopicOutput = JSON.parse(
      importTopicResult.outputJson,
    );
    expect(importTopicOutput.topicId).toBe(topicId);
    expect(importTopicOutput.name).toBe(
      `imported-${entityIdToAliasSafeFormat(topicId)}`,
    );
    expect(importTopicOutput.network).toBe(network);
    expect(importTopicOutput.alias).toBeUndefined();

    const listTopicArgs: Record<string, unknown> = {
      network,
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
    const topic = listTopicOutput.topics.find((t) => t.topicId === topicId);
    expect(topic).not.toBeNull();
    expect(topic?.topicId).toBe(topicId);
    expect(topic?.name).toBe(importTopicOutput.name);
    expect(topic?.network).toBe(network);
  });

  it('should import a topic with alias and verify with list', async () => {
    coreApi.state.delete(TOPIC_NAMESPACE, topicId);

    const alias = `imported-topic-${Date.now()}`;
    const importTopicArgs: Record<string, unknown> = {
      topic: topicId,
      name: alias,
    };
    const importTopicResult = await importTopic({
      args: importTopicArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(importTopicResult.status).toBe(Status.Success);
    const importTopicOutput: ImportTopicOutput = JSON.parse(
      importTopicResult.outputJson,
    );
    expect(importTopicOutput.topicId).toBe(topicId);
    expect(importTopicOutput.name).toBe(alias);
    expect(importTopicOutput.alias).toBe(alias);
    expect(importTopicOutput.network).toBe(network);

    const listTopicArgs: Record<string, unknown> = {
      network,
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
    const topic = listTopicOutput.topics.find((t) => t.topicId === topicId);
    expect(topic).not.toBeNull();
    expect(topic?.name).toBe(alias);
  });
});
