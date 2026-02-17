import type { CoreApi } from '@/core';
import type { DeleteTopicOutput } from '@/plugins/topic/commands/delete';
import type { TopicData } from '@/plugins/topic/schema';

import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
  makeStateMock,
  mockTopicAliasRecord,
} from '@/__tests__/mocks/mocks';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { deleteTopic } from '@/plugins/topic/commands/delete/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeTopicData = (overrides: Partial<TopicData> = {}): TopicData => ({
  name: 'test-topic',
  topicId: '0.0.1234',
  memo: 'Test topic',
  network: SupportedNetwork.TESTNET,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('topic plugin - delete command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes topic successfully by name', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic1', topicId: '0.0.1111' });

    const deleteTopicMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      findTopicByTopicId: jest.fn(),
      deleteTopic: deleteTopicMock,
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: 'topic1' });

    const result = await deleteTopic(args);

    expect(deleteTopicMock).toHaveBeenCalledWith('0.0.1111');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteTopicOutput = JSON.parse(result.outputJson!);
    expect(output.deletedTopic.name).toBe('topic1');
    expect(output.deletedTopic.topicId).toBe('0.0.1111');
  });

  test('deletes topic successfully by id', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic2', topicId: '0.0.2222' });

    const deleteTopicMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn(),
      findTopicByTopicId: jest.fn().mockReturnValue(topic),
      deleteTopic: deleteTopicMock,
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: '0.0.2222' });

    const result = await deleteTopic(args);

    expect(deleteTopicMock).toHaveBeenCalledWith('0.0.2222');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteTopicOutput = JSON.parse(result.outputJson!);
    expect(output.deletedTopic.name).toBe('topic2');
    expect(output.deletedTopic.topicId).toBe('0.0.2222');
  });

  test('returns failure when topic param is missing', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([]),
      findTopicByTopicId: jest.fn().mockReturnValue(null),
      deleteTopic: jest.fn(),
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, {});

    const result = await deleteTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
  });

  test('returns failure when topic with given name not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest
        .fn()
        .mockReturnValue([
          makeTopicData({ name: 'other', topicId: '0.0.3333' }),
        ]),
      findTopicByTopicId: jest.fn(),
      deleteTopic: jest.fn(),
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: 'missingTopic' });

    const result = await deleteTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Topic with name 'missingTopic' not found",
    );
  });

  test('returns failure when topic with given id not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn(),
      findTopicByTopicId: jest.fn().mockReturnValue(null),
      deleteTopic: jest.fn(),
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: '0.0.4444' });

    const result = await deleteTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain("Topic with ID '0.0.4444' not found");
  });

  test('returns failure when deleteTopic throws', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic5', topicId: '0.0.5555' });

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      findTopicByTopicId: jest.fn(),
      deleteTopic: jest.fn().mockImplementation(() => {
        throw new Error('db error');
      }),
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: 'topic5' });

    const result = await deleteTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to delete topic');
    expect(result.errorMessage).toContain('db error');
  });

  test('removes aliases of the topic for current network and type', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic-alias',
      topicId: '0.0.7777',
    });

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      findTopicByTopicId: jest.fn(),
      deleteTopic: jest.fn(),
    }));

    const alias = makeAliasMock();
    alias.list = jest.fn().mockReturnValue([mockTopicAliasRecord]);

    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: 'topic-alias' });

    const result = await deleteTopic(args);

    expect(alias.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: ALIAS_TYPE.Topic,
    });

    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith(
      mockTopicAliasRecord.alias,
      SupportedNetwork.TESTNET,
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteTopicOutput = JSON.parse(result.outputJson!);
    expect(output.deletedTopic.name).toBe('topic-alias');
    expect(output.deletedTopic.topicId).toBe('0.0.7777');
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe(
      `${mockTopicAliasRecord.alias} (${SupportedNetwork.TESTNET})`,
    );
  });
});
