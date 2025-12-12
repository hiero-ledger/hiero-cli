import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core/core-api/core-api';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import { Status } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import { createTopic, listTopics } from '@/plugins/topic';
import type { CreateTopicOutput } from '@/plugins/topic/commands/create';
import type { ListTopicsOutput } from '@/plugins/topic/commands/list';

import '@/core/utils/json-serialize';

describe('Create Topic Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();
  });
  it('should create a topic and verify with list method', async () => {
    const createTopicArgs: Record<string, unknown> = {
      memo: 'Test topic',
      adminKey: `${process.env.OPERATOR_ID}:${process.env.OPERATOR_KEY}`,
      submitKey: `${process.env.OPERATOR_ID}:${process.env.OPERATOR_KEY}`,
      name: 'test-topic',
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
    expect(createTopicOutput.name).toBe('test-topic');
    expect(createTopicOutput.network).toBe(network);
    expect(createTopicOutput.memo).toBe('Test topic');
    expect(createTopicOutput.adminKeyPresent).toBe(true);
    expect(createTopicOutput.submitKeyPresent).toBe(true);

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
      (topic) => topic.name == 'test-topic',
    );
    expect(topic).not.toBeNull();
    expect(topic?.name).toBe('test-topic');
    expect(topic?.network).toBe(network);
    expect(topic?.memo).toBe('Test topic');
    expect(topic?.adminKeyPresent).toBe(true);
    expect(topic?.submitKeyPresent).toBe(true);
    expect(topic?.createdAt).toBe(createTopicOutput.createdAt);
    expect(topic?.topicId).toBe(createTopicOutput.topicId);
  });
});
