import { makeAliasMock, makeLogger } from '@/__tests__/mocks/mocks';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { TopicAliasServiceImpl } from '@/plugins/topic/services/topic-alias.service';

const aliasParams = {
  alias: 'topic-alias',
  network: SupportedNetwork.TESTNET,
  topicId: '0.0.1234',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('topic plugin - TopicAliasService', () => {
  test('delegates topic alias availability check', () => {
    const alias = makeAliasMock();
    const service = new TopicAliasServiceImpl(alias, makeLogger());

    service.assertTopicAliasAvailable('topic-alias', SupportedNetwork.TESTNET);

    expect(alias.availableOrThrow).toHaveBeenCalledWith(
      'topic-alias',
      SupportedNetwork.TESTNET,
    );
  });

  test('registers topic alias with topic type', () => {
    const alias = makeAliasMock();
    const service = new TopicAliasServiceImpl(alias, makeLogger());

    service.registerTopicAlias(aliasParams);

    expect(alias.register).toHaveBeenCalledWith({
      alias: 'topic-alias',
      type: AliasType.Topic,
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.1234',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  test('does not register duplicate alias', () => {
    const alias = makeAliasMock();
    alias.exists.mockReturnValue(true);
    const service = new TopicAliasServiceImpl(alias, makeLogger());

    const result = service.tryRegisterTopicAlias(aliasParams);

    expect(result).toBe(false);
    expect(alias.register).not.toHaveBeenCalled();
  });

  test('registers alias when it is not duplicated', () => {
    const alias = makeAliasMock();
    alias.exists.mockReturnValue(false);
    const service = new TopicAliasServiceImpl(alias, makeLogger());

    const result = service.tryRegisterTopicAlias(aliasParams);

    expect(result).toBe(true);
    expect(alias.register).toHaveBeenCalledTimes(1);
  });
});
