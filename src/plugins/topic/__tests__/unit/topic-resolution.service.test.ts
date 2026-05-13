import { makeAliasMock } from '@/__tests__/mocks/mocks';
import { NotFoundError, StateError } from '@/core/errors';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { TopicResolutionServiceImpl } from '@/plugins/topic/services/topic-resolution.service';

describe('topic plugin - TopicResolutionService', () => {
  test('returns entity ID when topic reference is already an entity ID', () => {
    const alias = makeAliasMock();
    const service = new TopicResolutionServiceImpl(alias);

    const result = service.resolveTopicId('0.0.1234', SupportedNetwork.TESTNET);

    expect(result).toBe('0.0.1234');
    expect(alias.resolve).not.toHaveBeenCalled();
  });

  test('resolves topic alias to entity ID', () => {
    const alias = makeAliasMock();
    alias.resolve.mockReturnValue({
      alias: 'topic-alias',
      type: AliasType.Topic,
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.1234',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const service = new TopicResolutionServiceImpl(alias);

    const result = service.resolveTopicId(
      'topic-alias',
      SupportedNetwork.TESTNET,
    );

    expect(result).toBe('0.0.1234');
    expect(alias.resolve).toHaveBeenCalledWith(
      'topic-alias',
      AliasType.Topic,
      SupportedNetwork.TESTNET,
    );
  });

  test('throws NotFoundError when alias does not exist', () => {
    const alias = makeAliasMock();
    alias.resolve.mockReturnValue(null);
    const service = new TopicResolutionServiceImpl(alias);

    expect(() =>
      service.resolveTopicId('missing-topic', SupportedNetwork.TESTNET),
    ).toThrow(NotFoundError);
  });

  test('throws StateError when alias has no entity ID', () => {
    const alias = makeAliasMock();
    alias.resolve.mockReturnValue({
      alias: 'broken-topic',
      type: AliasType.Topic,
      network: SupportedNetwork.TESTNET,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const service = new TopicResolutionServiceImpl(alias);

    expect(() =>
      service.resolveTopicId('broken-topic', SupportedNetwork.TESTNET),
    ).toThrow(StateError);
  });
});
