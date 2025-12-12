import type { CoreApi } from '@/core';
import type { ListTopicsOutput } from '@/plugins/topic/commands/list';
import type { TopicData } from '@/plugins/topic/schema';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { listTopics } from '@/plugins/topic/commands/list/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeTopicData = (overrides: Partial<TopicData> = {}): TopicData => ({
  name: 'test-topic',
  topicId: '0.0.1234',
  memo: 'Test topic',
  network: 'testnet',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('topic plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when no topics exist', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([]),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(0);
    expect(output.topics).toEqual([]);
  });

  test('lists topics without keys', async () => {
    const logger = makeLogger();
    const topics = [
      makeTopicData({ topicId: '0.0.1111', memo: 'Topic 1', name: 'Topic 1' }),
      makeTopicData({ topicId: '0.0.2222', memo: 'Topic 2', name: 'Topic 2' }),
    ];

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue(topics),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(2);
    expect(output.topics).toHaveLength(2);
    expect(output.topics[0].name).toBe('Topic 1');
    expect(output.topics[0].topicId).toBe('0.0.1111');
    expect(output.topics[1].name).toBe('Topic 2');
    expect(output.topics[1].topicId).toBe('0.0.2222');
    // Verify stats are calculated
    expect(output.stats.withAdminKey).toBe(0);
    expect(output.stats.withSubmitKey).toBe(0);
  });

  test('lists topics with keys present', async () => {
    const logger = makeLogger();
    const topics = [
      makeTopicData({
        topicId: '0.0.3333',
        memo: 'Topic 3',
        name: 'Topic 3',
        adminKeyRefId: 'kr_admin123',
        submitKeyRefId: 'kr_submit123',
      }),
    ];

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue(topics),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, { keys: true });

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.topics[0].adminKeyPresent).toBe(true);
    expect(output.topics[0].submitKeyPresent).toBe(true);
    expect(output.stats.withAdminKey).toBe(1);
    expect(output.stats.withSubmitKey).toBe(1);
  });

  test('filters topics by network', async () => {
    const logger = makeLogger();

    const MAINNET_TOPIC = makeTopicData({
      topicId: '0.0.4444',
      memo: 'Mainnet Topic',
      name: 'Mainnet Topic',
      network: 'mainnet',
    });

    const TESTNET_TOPIC = makeTopicData({
      topicId: '0.0.5555',
      memo: 'Testnet Topic',
      name: 'Testnet Topic',
      network: 'testnet',
    });

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([MAINNET_TOPIC, TESTNET_TOPIC]),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, { network: 'mainnet' });

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    // Should only include mainnet topic after filtering in handler
    expect(output.totalCount).toBe(1);
    expect(output.topics[0].name).toBe(MAINNET_TOPIC.name);
    expect(output.topics[0].network).toBe(MAINNET_TOPIC.network);
  });

  test('returns empty list when no topics match network filter', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([
        makeTopicData({
          topicId: '0.0.5555',
          memo: 'Testnet Topic',
          name: 'Testnet Topic',
          network: 'testnet',
        }),
      ]),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, { network: 'mainnet' });

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(0);
    expect(output.topics).toEqual([]);
  });

  test('calculates statistics correctly', async () => {
    const logger = makeLogger();
    const topics = [
      makeTopicData({
        topicId: '0.0.1111',
        memo: 'Topic 1',
        name: 'Topic 1',
        adminKeyRefId: 'kr_admin1',
        network: 'testnet',
      }),
      makeTopicData({
        topicId: '0.0.2222',
        memo: 'Topic 2',
        name: 'Topic 2',
        submitKeyRefId: 'kr_submit1',
        network: 'mainnet',
      }),
      makeTopicData({
        topicId: '0.0.3333',
        memo: '(No memo)',
        name: 'Topic 3',
        network: 'testnet',
      }),
    ];

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue(topics),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(3);
    expect(output.stats.withAdminKey).toBe(1);
    expect(output.stats.withSubmitKey).toBe(1);
    expect(output.stats.withMemo).toBe(2); // Only counts real memos, not "(No memo)"
    expect(output.stats.byNetwork).toEqual({ testnet: 2, mainnet: 1 });
  });

  test('handles null memo correctly', async () => {
    const logger = makeLogger();
    const topics = [
      makeTopicData({
        topicId: '0.0.1111',
        memo: '(No memo)',
        name: 'Topic 1',
      }),
    ];

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue(topics),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListTopicsOutput = JSON.parse(result.outputJson!);
    expect(output.topics[0].memo).toBeNull();
  });

  test('returns error when listTopics throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockImplementation(() => {
        throw new Error('db error');
      }),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listTopics(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to list topics');
    expect(result.errorMessage).toContain('db error');
  });
});
