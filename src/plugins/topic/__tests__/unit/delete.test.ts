import type { CoreApi } from '@/core';
import type { TopicData } from '@/plugins/topic/schema';

import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
  makeStateMock,
  mockTopicAliasRecord,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { DeleteTopicOutputSchema } from '@/plugins/topic/commands/delete';
import { DeleteTopicCommand } from '@/plugins/topic/commands/delete/handler';
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
  ...overrides,
});

describe('topic plugin - delete command (ADR-007)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes topic successfully by alias', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic1', topicId: '0.0.1111' });

    const deleteTopicMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      loadTopic: jest.fn().mockReturnValue(topic),
      deleteTopic: deleteTopicMock,
    }));

    const alias = makeAliasMock();
    const aliasMock = {
      alias: 'topic1',
      entityId: '0.0.1111',
    };
    alias.resolveOrThrow = jest.fn().mockReturnValue(aliasMock);
    alias.list = jest.fn().mockReturnValue([aliasMock]);
    const network = makeNetworkMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { topic: 'topic1' });

    const result = await new DeleteTopicCommand().execute(args);

    expect(deleteTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.1111`,
    );
    const output = assertOutput(result.result, DeleteTopicOutputSchema);
    expect(output.deletedTopic.name).toBe('topic1');
    expect(output.deletedTopic.topicId).toBe('0.0.1111');
  });

  test('deletes topic successfully by id', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic2', topicId: '0.0.2222' });

    const deleteTopicMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn(),
      loadTopic: jest.fn().mockReturnValue(topic),
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

    const result = await new DeleteTopicCommand().execute(args);

    expect(deleteTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.2222`,
    );
    const output = assertOutput(result.result, DeleteTopicOutputSchema);
    expect(output.deletedTopic.name).toBe('topic2');
    expect(output.deletedTopic.topicId).toBe('0.0.2222');
  });

  test('throws when topic param is missing', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([]),
      loadTopic: jest.fn().mockReturnValue(null),
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

    await expect(new DeleteTopicCommand().execute(args)).rejects.toThrow();
  });

  test('throws when topic with given name not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest
        .fn()
        .mockReturnValue([
          makeTopicData({ name: 'other', topicId: '0.0.3333' }),
        ]),
      loadTopic: jest.fn().mockReturnValue(null),
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

    await expect(new DeleteTopicCommand().execute(args)).rejects.toThrow(
      "Topic with identifier 'missingTopic' not found",
    );
  });

  test('throws when topic with given id not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn(),
      loadTopic: jest.fn().mockReturnValue(null),
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

    await expect(new DeleteTopicCommand().execute(args)).rejects.toThrow(
      "Topic with identifier '0.0.4444' not found",
    );
  });

  test('throws when deleteTopic throws', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({ name: 'topic5', topicId: '0.0.5555' });

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      loadTopic: jest.fn().mockReturnValue(topic),
      deleteTopic: jest.fn().mockImplementation(() => {
        throw new InternalError('db error');
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

    await expect(new DeleteTopicCommand().execute(args)).rejects.toThrow(
      'db error',
    );
  });

  test('removes aliases of the topic for current network and type', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic-alias',
      topicId: '0.0.7777',
    });

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      loadTopic: jest.fn().mockReturnValue(topic),
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

    const result = await new DeleteTopicCommand().execute(args);

    expect(alias.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: AliasType.Topic,
    });

    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith(
      mockTopicAliasRecord.alias,
      SupportedNetwork.TESTNET,
    );

    const output = assertOutput(result.result, DeleteTopicOutputSchema);
    expect(output.deletedTopic.name).toBe('topic-alias');
    expect(output.deletedTopic.topicId).toBe('0.0.7777');
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe(
      `${mockTopicAliasRecord.alias} (${SupportedNetwork.TESTNET})`,
    );
  });
});
