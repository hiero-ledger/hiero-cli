import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import { Status } from '../../../core/shared/constants';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import '../../../core/utils/json-serialize';
import { createTopic, listTopics } from '../../../plugins/topic';
import { CreateTopicOutput } from '../../../plugins/topic/commands/create';
import { ListTopicsOutput } from '../../../plugins/topic/commands/list';

describe('Create Topic Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    await setDefaultOperatorForNetwork(coreApi);
  });
  it('should create a topic and verify with list method', async () => {
    const createTopicArgs: Record<string, unknown> = {
      memo: 'Test topic',
      adminKey: process.env.OPERATOR_KEY,
      submitKey: process.env.OPERATOR_KEY,
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
    expect(createTopicOutput.network).toBe('testnet');
    expect(createTopicOutput.memo).toBe('Test topic');
    expect(createTopicOutput.adminKeyPresent).toBe(true);
    expect(createTopicOutput.submitKeyPresent).toBe(true);

    const listTopicArgs: Record<string, unknown> = {
      network: 'testnet',
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
    expect(topic?.network).toBe('testnet');
    expect(topic?.memo).toBe('Test topic');
    expect(topic?.adminKeyPresent).toBe(true);
    expect(topic?.submitKeyPresent).toBe(true);
    expect(topic?.createdAt).toBe(createTopicOutput.createdAt);
    expect(topic?.topicId).toBe(createTopicOutput.topicId);
  });
});
