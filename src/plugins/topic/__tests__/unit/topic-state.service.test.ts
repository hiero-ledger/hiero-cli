import {
  makeLogger,
  makeStateMock,
  makeTopicData,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { TOPIC_NAMESPACE } from '@/plugins/topic/constants';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

describe('topic plugin - TopicStateService', () => {
  test('saves valid topic data in topic namespace', () => {
    const logger = makeLogger();
    const state = makeStateMock();
    const service = new TopicStateServiceImpl(state, logger);
    const topicData = makeTopicData({ topicId: '0.0.1234' });

    service.saveTopic('testnet:0.0.1234', topicData);

    expect(state.set).toHaveBeenCalledWith(
      TOPIC_NAMESPACE,
      'testnet:0.0.1234',
      topicData,
    );
  });

  test('throws ValidationError for invalid topic data on save', () => {
    const service = new TopicStateServiceImpl(makeStateMock(), makeLogger());
    const invalidTopicData = makeTopicData({ topicId: 'invalid' });

    expect(() =>
      service.saveTopic('testnet:invalid', invalidTopicData),
    ).toThrow(ValidationError);
  });

  test('returns null for corrupted topic data on load', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(makeTopicData({ topicId: 'invalid' }));
    const service = new TopicStateServiceImpl(state, makeLogger());

    const result = service.loadTopic('testnet:invalid');

    expect(result).toBeNull();
  });

  test('filters invalid topic data on list', () => {
    const validTopicData = makeTopicData({ topicId: '0.0.1234' });
    const invalidTopicData = makeTopicData({ topicId: 'invalid' });
    const state = makeStateMock({
      listData: [validTopicData, invalidTopicData],
    });
    const service = new TopicStateServiceImpl(state, makeLogger());

    const result = service.listTopics();

    expect(result).toEqual([validTopicData]);
  });

  test('deletes topic from topic namespace', () => {
    const state = makeStateMock();
    const service = new TopicStateServiceImpl(state, makeLogger());

    service.deleteTopic('testnet:0.0.1234');

    expect(state.delete).toHaveBeenCalledWith(
      TOPIC_NAMESPACE,
      'testnet:0.0.1234',
    );
  });
});
