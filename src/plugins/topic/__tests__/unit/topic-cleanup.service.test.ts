import type { TopicStateService } from '@/plugins/topic/services/topic-state.service.interface';

import { MOCK_TOPIC_ID } from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeLogger,
  makeTopicData,
} from '@/__tests__/mocks/mocks';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { TopicCleanupServiceImpl } from '@/plugins/topic/services/topic-cleanup.service';

describe('topic plugin - TopicCleanupService', () => {
  test('removes topic aliases for current network and deletes topic state', () => {
    const alias = makeAliasMock();
    alias.list.mockReturnValue([
      {
        alias: 'topic-a',
        type: AliasType.Topic,
        network: SupportedNetwork.TESTNET,
        entityId: MOCK_TOPIC_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        alias: 'topic-mainnet',
        type: AliasType.Topic,
        network: SupportedNetwork.MAINNET,
        entityId: MOCK_TOPIC_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        alias: 'account-a',
        type: AliasType.Account,
        network: SupportedNetwork.TESTNET,
        entityId: MOCK_TOPIC_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    const topicState: jest.Mocked<TopicStateService> = {
      saveTopic: jest.fn(),
      loadTopic: jest.fn(),
      listTopics: jest.fn(),
      deleteTopic: jest.fn(),
      applyTopicCreateFromBatchItem: jest.fn().mockResolvedValue(undefined),
      applyTopicUpdateFromBatchItem: jest.fn().mockResolvedValue(undefined),
      applyTopicDeleteFromBatchItem: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TopicCleanupServiceImpl(
      alias,
      topicState,
      makeLogger(),
    );

    const result = service.removeTopicFromLocalState(
      makeTopicData({ topicId: MOCK_TOPIC_ID }),
      SupportedNetwork.TESTNET,
    );

    expect(alias.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: AliasType.Topic,
    });
    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith(
      'topic-a',
      SupportedNetwork.TESTNET,
    );
    expect(topicState.deleteTopic).toHaveBeenCalledWith(
      `testnet:${MOCK_TOPIC_ID}`,
    );
    expect(result).toEqual(['topic-a (testnet)']);
  });
});
