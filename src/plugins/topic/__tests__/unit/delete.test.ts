import type { CoreApi, TransactionResult } from '@/core';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';

import {
  ED25519_DER_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_HEDERA_ENTITY_ID_2,
  MOCK_HEDERA_ENTITY_ID_3,
  MOCK_TOPIC_ADMIN_KEY_REF_ID,
  MOCK_TOPIC_CLI_ADMIN_KEY_REF_ID,
  MOCK_TOPIC_ID,
  MOCK_TX_ID_1,
  MOCK_TX_ID_2,
  MOCK_TX_ID_3,
} from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  createMockKmsRecord,
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
  makeTopicData,
  mockTopicAliasRecord,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, TransactionError, ValidationError } from '@/core';
import { createMockTopicInfo } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { TopicDeleteOutputSchema } from '@/plugins/topic/commands/delete';
import { topicDelete } from '@/plugins/topic/commands/delete/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

function topicMirrorInfo(topicId: string) {
  return createMockTopicInfo({
    topic_id: topicId,
    admin_key: { _type: 'ED25519', key: ED25519_DER_PUBLIC_KEY },
    deleted: false,
  });
}

function mirrorWithTopic(topicId: string): HederaMirrornodeService {
  return {
    ...makeMirrorMock(),
    getTopicInfo: jest.fn().mockResolvedValue(topicMirrorInfo(topicId)),
  } as unknown as HederaMirrornodeService;
}

function mirrorWithTopicNoAdminKey(topicId: string): HederaMirrornodeService {
  return {
    ...makeMirrorMock(),
    getTopicInfo: jest.fn().mockResolvedValue(
      createMockTopicInfo({
        topic_id: topicId,
        deleted: false,
      }),
    ),
  } as unknown as HederaMirrornodeService;
}

function kmsWithKrAdmin() {
  const kms = makeKmsMock();
  kms.get = jest.fn().mockImplementation((refId: string) => {
    if (refId === MOCK_TOPIC_ADMIN_KEY_REF_ID) {
      return createMockKmsRecord(
        MOCK_TOPIC_ADMIN_KEY_REF_ID,
        ED25519_HEX_PUBLIC_KEY,
      );
    }
    return undefined;
  });
  return kms;
}

describe('topic plugin - delete command (ADR-007)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes topic successfully by alias', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic1',
      topicId: MOCK_HEDERA_ENTITY_ID_1,
    });

    const topicDeleteMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([topic]),
      loadTopic: jest.fn().mockReturnValue(topic),
      deleteTopic: topicDeleteMock,
    }));

    const alias = makeAliasMock();
    const aliasMock = {
      alias: 'topic1',
      entityId: MOCK_HEDERA_ENTITY_ID_1,
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
    const args = makeArgs(api, logger, { topic: 'topic1', stateOnly: true });

    const result = await topicDelete(args);

    expect(topicDeleteMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_HEDERA_ENTITY_ID_1}`,
    );
    const output = assertOutput(result.result, TopicDeleteOutputSchema);
    expect(output.deletedTopic.name).toBe('topic1');
    expect(output.deletedTopic.topicId).toBe(MOCK_HEDERA_ENTITY_ID_1);
  });

  test('deletes topic successfully by id', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic2',
      topicId: MOCK_HEDERA_ENTITY_ID_2,
    });

    const topicDeleteMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn(),
      loadTopic: jest.fn().mockReturnValue(topic),
      deleteTopic: topicDeleteMock,
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
    const args = makeArgs(api, logger, {
      topic: MOCK_HEDERA_ENTITY_ID_2,
      stateOnly: true,
    });

    const result = await topicDelete(args);

    expect(topicDeleteMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_HEDERA_ENTITY_ID_2}`,
    );
    const output = assertOutput(result.result, TopicDeleteOutputSchema);
    expect(output.deletedTopic.name).toBe('topic2');
    expect(output.deletedTopic.topicId).toBe(MOCK_HEDERA_ENTITY_ID_2);
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

    await expect(topicDelete(args)).rejects.toThrow();
  });

  test('throws when topic with given name not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listTopics: jest.fn().mockReturnValue([
        makeTopicData({
          name: 'other',
          topicId: MOCK_HEDERA_ENTITY_ID_3,
        }),
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
    const args = makeArgs(api, logger, {
      topic: 'missingTopic',
      stateOnly: true,
    });

    await expect(topicDelete(args)).rejects.toThrow(
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
    const args = makeArgs(api, logger, {
      topic: MOCK_HEDERA_ENTITY_ID_1,
      stateOnly: true,
    });

    await expect(topicDelete(args)).rejects.toThrow(
      `Topic with identifier '${MOCK_HEDERA_ENTITY_ID_1}' not found`,
    );
  });

  test('throws when topicDelete throws', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic5',
      topicId: MOCK_HEDERA_ENTITY_ID_2,
    });

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
    const args = makeArgs(api, logger, { topic: 'topic5', stateOnly: true });

    await expect(topicDelete(args)).rejects.toThrow('db error');
  });

  test('removes aliases of the topic for current network and type', async () => {
    const logger = makeLogger();
    const topic = makeTopicData({
      name: 'topic-alias',
      topicId: MOCK_TOPIC_ID,
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
    const args = makeArgs(api, logger, {
      topic: 'topic-alias',
      stateOnly: true,
    });

    const result = await topicDelete(args);

    expect(alias.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: AliasType.Topic,
    });

    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith(
      mockTopicAliasRecord.alias,
      SupportedNetwork.TESTNET,
    );

    const output = assertOutput(result.result, TopicDeleteOutputSchema);
    expect(output.deletedTopic.name).toBe('topic-alias');
    expect(output.deletedTopic.topicId).toBe(MOCK_TOPIC_ID);
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe(
      `${mockTopicAliasRecord.alias} (${SupportedNetwork.TESTNET})`,
    );
  });

  describe('network delete (TopicDeleteTransaction)', () => {
    test('builds tx, signs with admin keys, executes, clears state', async () => {
      const logger = makeLogger();
      const topic = makeTopicData({
        name: 'topic-net',
        topicId: MOCK_HEDERA_ENTITY_ID_1,
        adminKeyRefIds: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
        adminKeyThreshold: 1,
      });

      const deleteTopicTxMock = jest.fn().mockReturnValue({ transaction: {} });
      const txSign = {
        sign: jest.fn().mockResolvedValue(createMockTransaction()),
        signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
      };
      const txExecute = {
        execute: jest.fn().mockResolvedValue({
          transactionId: MOCK_TX_ID_1,
          success: true,
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
        executeContractCreateFlow: jest.fn(),
      };

      const deleteTopicStateMock = jest.fn();
      MockedHelper.mockImplementation(() => ({
        loadTopic: jest.fn().mockReturnValue(topic),
        deleteTopic: deleteTopicStateMock,
      }));

      const alias = makeAliasMock();
      alias.resolveOrThrow = jest.fn().mockReturnValue({
        entityId: MOCK_HEDERA_ENTITY_ID_1,
      });
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkMock(SupportedNetwork.TESTNET);

      const keyResolver: Pick<KeyResolverService, 'resolveSigningKey'> = {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: MOCK_TOPIC_ADMIN_KEY_REF_ID,
          publicKey: ED25519_HEX_PUBLIC_KEY,
        }),
      };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        mirror: mirrorWithTopic(MOCK_HEDERA_ENTITY_ID_1),
        kms: kmsWithKrAdmin(),
        topic: {
          deleteTopic: deleteTopicTxMock,
          createTopic: jest.fn(),
          submitMessage: jest.fn(),
          updateTopic: jest.fn(),
        },
        txSign,
        txExecute,
        keyResolver: keyResolver as KeyResolverService,
      };

      const args = makeArgs(api, logger, {
        topic: 'topic-net',
        stateOnly: false,
        adminKey: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
      });

      const result = await topicDelete(args);

      expect(deleteTopicTxMock).toHaveBeenCalledWith({
        topicId: MOCK_HEDERA_ENTITY_ID_1,
      });
      expect(txSign.sign).toHaveBeenCalledWith(
        {},
        expect.arrayContaining([MOCK_TOPIC_ADMIN_KEY_REF_ID]),
      );
      expect(txExecute.execute).toHaveBeenCalled();

      const output = assertOutput(result.result, TopicDeleteOutputSchema);
      expect(output.stateOnly).toBe(false);
      expect(output.transactionId).toBe(MOCK_TX_ID_1);
      expect(deleteTopicStateMock).toHaveBeenCalledWith(
        `${SupportedNetwork.TESTNET}:${MOCK_HEDERA_ENTITY_ID_1}`,
      );
    });

    test('throws ValidationError when no admin keys on network path', async () => {
      const logger = makeLogger();
      const topic = makeTopicData({
        topicId: MOCK_HEDERA_ENTITY_ID_1,
        adminKeyRefIds: [],
        adminKeyThreshold: 0,
      });
      MockedHelper.mockImplementation(() => ({
        loadTopic: jest.fn().mockReturnValue(topic),
      }));
      const alias = makeAliasMock();
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkMock(SupportedNetwork.TESTNET);
      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        mirror: mirrorWithTopicNoAdminKey(MOCK_HEDERA_ENTITY_ID_1),
      };
      const args = makeArgs(api, logger, {
        topic: MOCK_HEDERA_ENTITY_ID_1,
        adminKey: [MOCK_TOPIC_CLI_ADMIN_KEY_REF_ID],
      });

      await expect(topicDelete(args)).rejects.toThrow(ValidationError);
    });

    test('throws TransactionError when execute returns failure', async () => {
      const logger = makeLogger();
      const topic = makeTopicData({
        topicId: MOCK_HEDERA_ENTITY_ID_1,
        adminKeyRefIds: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
        adminKeyThreshold: 1,
      });

      const deleteTopicTxMock = jest.fn().mockReturnValue({ transaction: {} });
      const txSign = {
        sign: jest.fn().mockResolvedValue(createMockTransaction()),
        signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
      };
      const txExecute = {
        execute: jest.fn().mockResolvedValue({
          transactionId: MOCK_TX_ID_2,
          success: false,
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'failed' } },
        } as TransactionResult),
        executeContractCreateFlow: jest.fn(),
      };

      MockedHelper.mockImplementation(() => ({
        loadTopic: jest.fn().mockReturnValue(topic),
        deleteTopic: jest.fn(),
      }));

      const alias = makeAliasMock();
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkMock(SupportedNetwork.TESTNET);

      const keyResolver: Pick<KeyResolverService, 'resolveSigningKey'> = {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: MOCK_TOPIC_ADMIN_KEY_REF_ID,
          publicKey: ED25519_HEX_PUBLIC_KEY,
        }),
      };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        mirror: mirrorWithTopic(MOCK_HEDERA_ENTITY_ID_1),
        kms: kmsWithKrAdmin(),
        topic: {
          deleteTopic: deleteTopicTxMock,
          createTopic: jest.fn(),
          submitMessage: jest.fn(),
          updateTopic: jest.fn(),
        },
        txSign,
        txExecute,
        keyResolver: keyResolver as KeyResolverService,
      };

      const args = makeArgs(api, logger, {
        topic: MOCK_HEDERA_ENTITY_ID_1,
        adminKey: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
      });

      await expect(topicDelete(args)).rejects.toThrow(TransactionError);
    });

    test('deletes on network without state entry when --admin-key is provided', async () => {
      const logger = makeLogger();
      const deleteTopicTxMock = jest.fn().mockReturnValue({ transaction: {} });
      const txSign = {
        sign: jest.fn().mockResolvedValue(createMockTransaction()),
        signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
      };
      const txExecute = {
        execute: jest.fn().mockResolvedValue({
          transactionId: MOCK_TX_ID_3,
          success: true,
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
        executeContractCreateFlow: jest.fn(),
      };

      const deleteTopicStateMock = jest.fn();
      MockedHelper.mockImplementation(() => ({
        loadTopic: jest.fn().mockReturnValue(null),
        deleteTopic: deleteTopicStateMock,
      }));

      const alias = makeAliasMock();
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkMock(SupportedNetwork.TESTNET);

      const keyResolver: Pick<KeyResolverService, 'resolveSigningKey'> = {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: MOCK_TOPIC_CLI_ADMIN_KEY_REF_ID,
          publicKey: ED25519_HEX_PUBLIC_KEY,
        }),
      };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        mirror: mirrorWithTopic(MOCK_HEDERA_ENTITY_ID_1),
        topic: {
          deleteTopic: deleteTopicTxMock,
          createTopic: jest.fn(),
          submitMessage: jest.fn(),
          updateTopic: jest.fn(),
        },
        txSign,
        txExecute,
        keyResolver: keyResolver as KeyResolverService,
      };

      const args = makeArgs(api, logger, {
        topic: MOCK_HEDERA_ENTITY_ID_1,
        adminKey: [MOCK_TOPIC_CLI_ADMIN_KEY_REF_ID],
      });

      const result = await topicDelete(args);

      expect(deleteTopicTxMock).toHaveBeenCalledWith({
        topicId: MOCK_HEDERA_ENTITY_ID_1,
      });
      expect(keyResolver.resolveSigningKey).toHaveBeenCalled();
      expect(deleteTopicStateMock).toHaveBeenCalledWith(
        `${SupportedNetwork.TESTNET}:${MOCK_HEDERA_ENTITY_ID_1}`,
      );

      const output = assertOutput(result.result, TopicDeleteOutputSchema);
      expect(output.transactionId).toBe(MOCK_TX_ID_3);
    });

    test('throws ValidationError when topic not in state and no admin-key', async () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        loadTopic: jest.fn().mockReturnValue(null),
      }));
      const alias = makeAliasMock();
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkMock(SupportedNetwork.TESTNET);
      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        mirror: mirrorWithTopic(MOCK_HEDERA_ENTITY_ID_1),
      };
      const args = makeArgs(api, logger, {
        topic: MOCK_HEDERA_ENTITY_ID_1,
      });

      await expect(topicDelete(args)).rejects.toThrow(ValidationError);
    });
  });
});
