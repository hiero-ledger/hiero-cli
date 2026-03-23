import type { CoreApi, TransactionResult } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { TopicData } from '@/plugins/topic/schema';

import {
  ED25519_DER_PRIVATE_KEY,
  ED25519_DER_PRIVATE_KEY_ADMIN_2,
  ED25519_DER_PRIVATE_KEY_SUBMIT_1,
  MOCK_TOPIC_ADMIN_KEY_REF_ID,
  MOCK_TOPIC_ADMIN_KEY_REF_ID_2,
  MOCK_TOPIC_SUBMIT_KEY_REF_ID,
} from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { TopicUpdateOutputSchema } from '@/plugins/topic/commands/update';
import { topicUpdate } from '@/plugins/topic/commands/update/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const EXISTING_TOPIC: TopicData = {
  name: 'my-topic',
  topicId: '0.0.9999',
  memo: 'Original memo',
  adminKeyRefIds: [MOCK_TOPIC_ADMIN_KEY_REF_ID],
  submitKeyRefIds: [MOCK_TOPIC_SUBMIT_KEY_REF_ID],
  adminKeyThreshold: 1,
  submitKeyThreshold: 1,
  network: SupportedNetwork.TESTNET,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const makeApiMocks = ({
  updateTopicImpl,
  executeImpl,
  network = 'testnet',
}: {
  updateTopicImpl?: jest.Mock;
  executeImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const topicTransactions = {
    createTopic: jest.fn(),
    submitMessage: jest.fn(),
    deleteTopic: jest.fn(),
    updateTopic:
      updateTopicImpl || jest.fn().mockReturnValue({ transaction: {} }),
  };

  const txSign = {
    sign: jest.fn().mockResolvedValue(createMockTransaction()),
    signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
  };

  const txExecute = {
    execute:
      executeImpl ||
      jest.fn().mockResolvedValue({
        transactionId: '0.0.100000@1700000000.000000000',
        success: true,
        consensusTimestamp: '2024-01-02T00:00:00.000Z',
        receipt: { status: { status: 'success' } },
      } as TransactionResult),
    executeContractCreateFlow: jest.fn(),
  };

  const networkMock = makeNetworkMock(network);
  const kms = makeKmsMock();
  kms.importPrivateKey.mockImplementation((_keyType: string, key: string) => {
    const keyMap: Record<string, string> = {
      [ED25519_DER_PRIVATE_KEY]: MOCK_TOPIC_ADMIN_KEY_REF_ID,
      [ED25519_DER_PRIVATE_KEY_ADMIN_2]: MOCK_TOPIC_ADMIN_KEY_REF_ID_2,
      [ED25519_DER_PRIVATE_KEY_SUBMIT_1]: MOCK_TOPIC_SUBMIT_KEY_REF_ID,
    };
    return {
      keyRefId: keyMap[key] ?? `kr_${key.slice(-5)}`,
      publicKey: 'mock-public-key',
    };
  });
  kms.importPublicKey.mockImplementation((_keyType: string, key: string) => ({
    keyRefId: `kr_${key.slice(-5)}`,
    publicKey: key,
  }));
  const alias = makeAliasMock();

  return { topicTransactions, txSign, txExecute, networkMock, kms, alias };
};

const makeUpdateArgs = (
  api: Partial<CoreApi>,
  logger: ReturnType<typeof makeLogger>,
  inputArgs: Record<string, unknown>,
) => {
  return makeArgs(api, logger, { topic: '0.0.9999', ...inputArgs });
};

describe('topic plugin - update command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates memo successfully', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'Updated memo' });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.topicId).toBe('0.0.9999');
    expect(output.memo).toBe('Updated memo');
    expect(output.updatedFields).toContain('memo');

    expect(topicTransactions.updateTopic).toHaveBeenCalledWith(
      expect.objectContaining({ topicId: '0.0.9999', memo: 'Updated memo' }),
    );
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.9999`,
      expect.objectContaining({ memo: 'Updated memo' }),
    );
  });

  test('updates adminKey with old + new key signing', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: saveTopicMock,
    }));

    const newAdminKey = `0.0.222:${ED25519_DER_PRIVATE_KEY_ADMIN_2}`;

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { adminKey: [newAdminKey] });
    await topicUpdate(args);

    const signCall = txSign.sign.mock.calls[0];
    const signerKeyRefIds = signCall[1] as string[];
    expect(signerKeyRefIds).toContain(MOCK_TOPIC_ADMIN_KEY_REF_ID);
    expect(signerKeyRefIds).toContain(MOCK_TOPIC_ADMIN_KEY_REF_ID_2);
  });

  test('updates submitKey with only old adminKey signing', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: jest.fn(),
    }));

    const newSubmitKey = `0.0.333:${ED25519_DER_PRIVATE_KEY_SUBMIT_1}`;

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { submitKey: [newSubmitKey] });
    await topicUpdate(args);

    const signCall = txSign.sign.mock.calls[0];
    const signerKeyRefIds = signCall[1] as string[];
    expect(signerKeyRefIds).toContain(MOCK_TOPIC_ADMIN_KEY_REF_ID);
    expect(signerKeyRefIds).toHaveLength(1);
  });

  test('updates multiple fields at once', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: saveTopicMock,
    }));

    const newSubmitKey = `0.0.333:${ED25519_DER_PRIVATE_KEY_SUBMIT_1}`;

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, {
      memo: 'New memo',
      submitKey: [newSubmitKey],
    });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
    expect(output.updatedFields).toContain('submitKey');
  });

  test('throws NotFoundError when topic not in state', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(null),
      saveTopic: jest.fn(),
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'New memo' });
    await expect(topicUpdate(args)).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError for immutable topic (no admin key) with non-expiration update', async () => {
    const logger = makeLogger();
    const immutableTopic = {
      ...EXISTING_TOPIC,
      adminKeyRefIds: [],
      adminKeyThreshold: 0,
    };
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(immutableTopic),
      saveTopic: jest.fn(),
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'New memo' });
    await expect(topicUpdate(args)).rejects.toThrow(ValidationError);
  });

  test('allows expirationTime-only update on immutable topic', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    const immutableTopic = {
      ...EXISTING_TOPIC,
      adminKeyRefIds: [],
      adminKeyThreshold: 0,
    };
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(immutableTopic),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, {
      expirationTime: '2025-12-31T23:59:59.000Z',
    });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.updatedFields).toContain('expirationTime');

    const signCall = txSign.sign.mock.calls[0];
    const signerKeyRefIds = signCall[1] as string[];
    expect(signerKeyRefIds).toHaveLength(0);
  });

  test('throws TransactionError when execute fails', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: jest.fn(),
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-fail',
          success: false,
          consensusTimestamp: '2024-01-02T00:00:00.000Z',
          receipt: { status: { status: 'failure' } },
        } as unknown as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'Fail memo' });
    await expect(topicUpdate(args)).rejects.toThrow(TransactionError);
  });

  test('does not mutate existing TopicData (immutable merge)', async () => {
    const logger = makeLogger();
    const existingCopy = { ...EXISTING_TOPIC };
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(existingCopy),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'Changed' });
    await topicUpdate(args);

    expect(existingCopy.memo).toBe('Original memo');

    const savedData = saveTopicMock.mock.calls[0][1];
    expect(savedData.memo).toBe('Changed');
    expect(savedData).not.toBe(existingCopy);
  });

  test('deduplicates signer keys when new adminKey equals old', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: jest.fn(),
    }));

    const sameAdminKey = `0.0.123456:${ED25519_DER_PRIVATE_KEY}`;

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { adminKey: [sameAdminKey] });
    await topicUpdate(args);

    const signCall = txSign.sign.mock.calls[0];
    const signerKeyRefIds = signCall[1] as string[];
    const uniqueIds = new Set(signerKeyRefIds);
    expect(uniqueIds.size).toBe(signerKeyRefIds.length);
  });

  test('clears memo when value is "null"', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { memo: 'null' });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo (cleared)');

    expect(topicTransactions.updateTopic).toHaveBeenCalledWith(
      expect.objectContaining({ memo: null }),
    );

    const savedData = saveTopicMock.mock.calls[0][1];
    expect(savedData.memo).toBeUndefined();
  });

  test('rejects submitKey when array contains "null"', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { submitKey: ['null'] });
    await expect(topicUpdate(args)).rejects.toThrow();
  });

  test('clears autoRenewAccount when value is "null"', async () => {
    const logger = makeLogger();
    const topicWithAutoRenew = {
      ...EXISTING_TOPIC,
      autoRenewAccount: '0.0.5555',
    };
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue(topicWithAutoRenew),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { autoRenewAccount: 'null' });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.updatedFields).toContain('autoRenewAccount (cleared)');

    expect(topicTransactions.updateTopic).toHaveBeenCalledWith(
      expect.objectContaining({ autoRenewAccountId: null }),
    );

    const savedData = saveTopicMock.mock.calls[0][1];
    expect(savedData.autoRenewAccount).toBeUndefined();
  });

  test('updates autoRenewPeriod', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      loadTopic: jest.fn().mockReturnValue({ ...EXISTING_TOPIC }),
      saveTopic: saveTopicMock,
    }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      kms,
      alias: alias as AliasService,
      logger,
    };

    const args = makeUpdateArgs(api, logger, { autoRenewPeriod: 7_776_000 });
    const result = await topicUpdate(args);

    const output = assertOutput(result.result, TopicUpdateOutputSchema);
    expect(output.updatedFields).toContain('autoRenewPeriod');
    expect(output.autoRenewPeriod).toBe(7_776_000);
  });
});
