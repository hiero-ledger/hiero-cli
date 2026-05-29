import type { CoreApi } from '@/core';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';

import {
  ECDSA_DER_PUBLIC_KEY,
  ECDSA_HEX_PUBLIC_KEY,
  ED25519_DER_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
  MOCK_TOPIC_ADMIN_KEY_REF_ID,
  MOCK_TOPIC_ID,
  MOCK_TOPIC_SUBMIT_KEY_REF_ID,
} from '@/__tests__/mocks/fixtures';
import {
  createMockKmsRecord,
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { createMockTopicInfo } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { TopicImportOutputSchema } from '@/plugins/topic/commands/import';
import { topicImport } from '@/plugins/topic/commands/import/handler';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

jest.mock('../../services/topic-state.service', () => ({
  TopicStateServiceImpl: jest.fn(),
}));

const MockedHelper = TopicStateServiceImpl as jest.Mock;

describe('topic plugin - import command (ADR-007)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('imports topic successfully with name', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      memo: 'Imported topic memo',
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(
      { ...api, logger },
      {
        topic: MOCK_TOPIC_ID,
        name: 'my-topic',
      },
    );

    const result = await topicImport(args);

    expect(mirrorMock.getTopicInfo).toHaveBeenCalledWith(MOCK_TOPIC_ID);
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'my-topic',
        type: AliasType.Topic,
        network: SupportedNetwork.TESTNET,
        entityId: MOCK_TOPIC_ID,
      }),
    );
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_TOPIC_ID}`,
      expect.objectContaining({
        name: 'my-topic',
        topicId: MOCK_TOPIC_ID,
        memo: 'Imported topic memo',
        network: SupportedNetwork.TESTNET,
      }),
    );

    const output = assertOutput(result.result, TopicImportOutputSchema);
    expect(output.topicId).toBe(MOCK_TOPIC_ID);
    expect(output.name).toBe('my-topic');
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.memo).toBe('Imported topic memo');
  });

  test('imports topic successfully without name', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(
      { ...api, logger },
      {
        topic: MOCK_TOPIC_ID,
      },
    );

    const result = await topicImport(args);

    expect(mirrorMock.getTopicInfo).toHaveBeenCalledWith(MOCK_TOPIC_ID);
    expect(alias.register).not.toHaveBeenCalled();
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_TOPIC_ID}`,
      expect.objectContaining({
        topicId: MOCK_TOPIC_ID,
        network: SupportedNetwork.TESTNET,
      }),
    );

    const output = assertOutput(result.result, TopicImportOutputSchema);
    expect(output.topicId).toBe(MOCK_TOPIC_ID);
    expect(output.name).toBe(undefined);
  });

  test('imports topic with admin_key and submit_key matched in KMS', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      memo: 'Topic with keys',
      created_timestamp: '1704067200.000000000',
      admin_key: {
        _type: MirrorNodeKeyType.ED25519,
        key: ED25519_DER_PUBLIC_KEY,
      },
      submit_key: {
        _type: MirrorNodeKeyType.ECDSA_SECP256K1,
        key: ECDSA_DER_PUBLIC_KEY,
      },
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const kms = makeKmsMock();
    kms.findByPublicKey.mockImplementation((publicKey: string) => {
      if (publicKey === ED25519_HEX_PUBLIC_KEY)
        return createMockKmsRecord(MOCK_TOPIC_ADMIN_KEY_REF_ID, publicKey);
      if (publicKey === ECDSA_HEX_PUBLIC_KEY)
        return createMockKmsRecord(MOCK_TOPIC_SUBMIT_KEY_REF_ID, publicKey);
      return undefined;
    });

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
      kms,
    };

    const args = makeArgs({ ...api, logger }, { topic: MOCK_TOPIC_ID });

    const result = await topicImport(args);

    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_TOPIC_ID}`,
      expect.objectContaining({
        topicId: MOCK_TOPIC_ID,
        adminKeyRefIds: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
        submitKeyRefIds: [MOCK_TOPIC_SUBMIT_KEY_REF_ID],
      }),
    );

    const output = assertOutput(result.result, TopicImportOutputSchema);
    expect(output.adminKeyPresent).toBe(true);
    expect(output.submitKeyPresent).toBe(true);
  });

  test('imports topic with admin_key when key is not in KMS', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      created_timestamp: '1704067200.000000000',
      admin_key: {
        _type: MirrorNodeKeyType.ED25519,
        key: ED25519_DER_PUBLIC_KEY,
      },
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const kms = makeKmsMock();
    kms.findByPublicKey.mockReturnValue(undefined);

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
      kms,
    };

    const args = makeArgs({ ...api, logger }, { topic: MOCK_TOPIC_ID });

    const result = await topicImport(args);

    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_TOPIC_ID}`,
      expect.objectContaining({
        topicId: MOCK_TOPIC_ID,
        adminKeyRefIds: [],
      }),
    );

    const output = assertOutput(result.result, TopicImportOutputSchema);
    expect(output.adminKeyPresent).toBe(true);
  });

  test('imports topic with submit_key when key is in KMS', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: saveTopicMock,
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      created_timestamp: '1704067200.000000000',
      submit_key: {
        _type: MirrorNodeKeyType.ED25519,
        key: ED25519_DER_PUBLIC_KEY,
      },
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const kms = makeKmsMock();
    kms.findByPublicKey.mockImplementation((publicKey: string) =>
      publicKey === ED25519_HEX_PUBLIC_KEY
        ? createMockKmsRecord(MOCK_TOPIC_SUBMIT_KEY_REF_ID, publicKey)
        : undefined,
    );

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
      kms,
    };

    const args = makeArgs({ ...api, logger }, { topic: MOCK_TOPIC_ID });

    const result = await topicImport(args);

    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_TOPIC_ID}`,
      expect.objectContaining({
        submitKeyRefIds: [MOCK_TOPIC_SUBMIT_KEY_REF_ID],
      }),
    );

    const output = assertOutput(result.result, TopicImportOutputSchema);
    expect(output.submitKeyPresent).toBe(true);
  });

  test('throws when topic already exists in state', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({
        topicId: MOCK_TOPIC_ID,
        name: 'existing',
      }),
      saveTopic: jest.fn(),
    }));

    const topicInfo = createMockTopicInfo({
      topic_id: MOCK_TOPIC_ID,
      created_timestamp: '1704067200.000000000',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest.fn().mockResolvedValue(topicInfo);

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(
      { ...api, logger },
      {
        topic: MOCK_TOPIC_ID,
        name: 'new-topic',
      },
    );

    await expect(topicImport(args)).rejects.toThrow(
      `Topic with ID '${MOCK_TOPIC_ID}' already exists in state`,
    );
  });

  test('throws when mirror.getTopicInfo throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: jest.fn(),
    }));

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTopicInfo: jest.Mock;
    };
    mirrorMock.getTopicInfo = jest
      .fn()
      .mockRejectedValue(new Error('Topic not found'));

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(
      { ...api, logger },
      {
        topic: MOCK_TOPIC_ID,
      },
    );

    await expect(topicImport(args)).rejects.toThrow('Topic not found');
  });
});
