import { MOCK_TOPIC_ID } from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeLogger,
  makeReceiptMock,
  makeStateMock,
  makeTopicData,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { TOPIC_NAMESPACE } from '@/plugins/topic/constants';
import { TopicAliasServiceImpl } from '@/plugins/topic/services/topic-alias.service';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

describe('topic plugin - TopicStateService', () => {
  test('saves valid topic data in topic namespace', () => {
    const logger = makeLogger();
    const state = makeStateMock();
    const service = new TopicStateServiceImpl(
      state,
      logger,
      makeReceiptMock(),
      makeAliasMock(),
      new TopicAliasServiceImpl(makeAliasMock(), logger),
    );
    const topicData = makeTopicData({ topicId: MOCK_TOPIC_ID });

    service.saveTopic(`testnet:${MOCK_TOPIC_ID}`, topicData);

    expect(state.set).toHaveBeenCalledWith(
      TOPIC_NAMESPACE,
      `testnet:${MOCK_TOPIC_ID}`,
      topicData,
    );
  });

  test('throws ValidationError for invalid topic data on save', () => {
    const service = new TopicStateServiceImpl(
      makeStateMock(),
      makeLogger(),
      makeReceiptMock(),
      makeAliasMock(),
      new TopicAliasServiceImpl(makeAliasMock(), makeLogger()),
    );
    const invalidTopicData = makeTopicData({ topicId: 'invalid' });

    expect(() =>
      service.saveTopic('testnet:invalid', invalidTopicData),
    ).toThrow(ValidationError);
  });

  test('returns null for corrupted topic data on load', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(makeTopicData({ topicId: 'invalid' }));
    const service = new TopicStateServiceImpl(
      state,
      makeLogger(),
      makeReceiptMock(),
      makeAliasMock(),
      new TopicAliasServiceImpl(makeAliasMock(), makeLogger()),
    );

    const result = service.loadTopic('testnet:invalid');

    expect(result).toBeNull();
  });

  test('filters invalid topic data on list', () => {
    const validTopicData = makeTopicData({ topicId: MOCK_TOPIC_ID });
    const invalidTopicData = makeTopicData({ topicId: 'invalid' });
    const state = makeStateMock({
      listData: [validTopicData, invalidTopicData],
    });
    const service = new TopicStateServiceImpl(
      state,
      makeLogger(),
      makeReceiptMock(),
      makeAliasMock(),
      new TopicAliasServiceImpl(makeAliasMock(), makeLogger()),
    );

    const result = service.listTopics();

    expect(result).toEqual([validTopicData]);
  });

  test('deletes topic from topic namespace', () => {
    const state = makeStateMock();
    const service = new TopicStateServiceImpl(
      state,
      makeLogger(),
      makeReceiptMock(),
      makeAliasMock(),
      new TopicAliasServiceImpl(makeAliasMock(), makeLogger()),
    );

    service.deleteTopic(`testnet:${MOCK_TOPIC_ID}`);

    expect(state.delete).toHaveBeenCalledWith(
      TOPIC_NAMESPACE,
      `testnet:${MOCK_TOPIC_ID}`,
    );
  });
});
