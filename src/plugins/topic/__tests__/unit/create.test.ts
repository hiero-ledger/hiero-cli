import type { CoreApi, TransactionResult } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';

import { ED25519_DER_PRIVATE_KEY } from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError, SupportedNetwork } from '@/core';
import { TransactionError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { CreateTopicOutputSchema } from '@/plugins/topic/commands/create';
import { topicCreate } from '@/plugins/topic/commands/create/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeApiMocks = ({
  topicCreateImpl,
  executeImpl,
  network = 'testnet',
}: {
  topicCreateImpl?: jest.Mock;
  executeImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const topicTransactions = {
    createTopic: topicCreateImpl || jest.fn(),
    submitMessage: jest.fn(),
  };

  const txSign = {
    sign: jest.fn().mockResolvedValue(createMockTransaction()),
    signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
  };

  const txExecute = {
    execute: executeImpl || jest.fn(),
    executeContractCreateFlow: jest.fn(),
  };

  const networkMock = makeNetworkMock(network);
  const kms = makeKmsMock();
  kms.importPrivateKey.mockImplementation((keyType: string, key: string) => {
    const keyMap: Record<string, string> = {
      [ED25519_DER_PRIVATE_KEY]: 'kr_admin',
      '302e020100300506032b6570042204201111111111111111111111111111111111111111111111111111111111111111':
        'kr_admin',
      '302e020100300506032b6570042204202222222222222222222222222222222222222222222222222222222222222222':
        'kr_submit',
      '302e020100300506032b6570042204203333333333333333333333333333333333333333333333333333333333333333':
        'kr_33333',
      '302e020100300506032b657004220420admin': 'kr_admin',
      '302e020100300506032b657004220420submit': 'kr_submit',
      '302e020100300506032b6570042204204444444444444444444444444444444444444444444444444444444444444444':
        'kr_44444',
      '302e020100300506032b6570042204205555555555555555555555555555555555555555555555555555555555555555':
        'kr_55555',
    };
    return {
      keyRefId: keyMap[key] || `kr_${key.slice(-5)}`,
      publicKey: 'mock-public-key',
    };
  });
  const alias = makeAliasMock();

  return { topicTransactions, txSign, txExecute, networkMock, kms, alias };
};

describe('topic plugin - create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates topic successfully with memo', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        topicCreateImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.100000@1700000000.000000000',
          success: true,
          topicId: '0.0.9999',
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
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

    const args = makeArgs(api, logger, {
      memo: 'Test topic memo',
    });

    const result = await topicCreate(args);

    const output = assertOutput(result.result, CreateTopicOutputSchema);
    expect(output.topicId).toBe('0.0.9999');
    expect(output.memo).toBe('Test topic memo');
    expect(output.network).toBe('testnet');
    expect(output.transactionId).toBe('0.0.100000@1700000000.000000000');

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: 'Test topic memo',
      adminKey: undefined,
      submitKey: undefined,
    });
    expect(txExecute.execute).toHaveBeenCalled();
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.9999`,
      expect.objectContaining({
        topicId: '0.0.9999',
        memo: 'Test topic memo',
        network: 'testnet',
      }),
    );
  });

  test('creates topic successfully with admin and submit keys', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const adminKey = `0.0.123456:${ED25519_DER_PRIVATE_KEY}`;
    const submitKey =
      '0.0.789012:302e020100300506032b6570042204202222222222222222222222222222222222222222222222222222222222222222';

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        topicCreateImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.100000@1700000000.000000001',
          success: true,
          topicId: '0.0.8888',
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
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

    const args = makeArgs(api, logger, {
      memo: 'Test topic',
      adminKey,
      submitKey,
    });

    const result = await topicCreate(args);

    const output = assertOutput(result.result, CreateTopicOutputSchema);
    expect(output.topicId).toBe('0.0.8888');
    expect(output.adminKeyPresent).toBe(true);
    expect(output.submitKeyPresent).toBe(true);

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: 'Test topic',
      adminKey: expect.any(Object),
      submitKey: expect.any(Object),
    });
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      ED25519_DER_PRIVATE_KEY,
      'local',
      ['topic:admin'],
    );
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      '302e020100300506032b6570042204202222222222222222222222222222222222222222222222222222222222222222',
      'local',
      ['topic:submit'],
    );
    expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.8888`,
      expect.objectContaining({
        topicId: '0.0.8888',
        memo: 'Test topic',
        adminKeyRefId: 'kr_admin',
        submitKeyRefId: 'kr_submit',
        network: 'testnet',
      }),
    );
  });

  test('creates topic successfully without memo', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        topicCreateImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.100000@1700000000.000000002',
          success: true,
          topicId: '0.0.7777',
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
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

    const args = makeArgs(api, logger, {});

    const result = await topicCreate(args);

    const output = assertOutput(result.result, CreateTopicOutputSchema);
    expect(output.topicId).toBe('0.0.7777');
    expect(output.memo).toBeUndefined();

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: undefined,
      adminKey: undefined,
      submitKey: undefined,
    });
    expect(saveTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.7777`,
      expect.objectContaining({
        topicId: '0.0.7777',
        memo: '(No memo)',
        network: 'testnet',
      }),
    );
  });

  test('throws TransactionError when execute returns failure', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveTopic: jest.fn() }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        topicCreateImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-123',
          success: false,
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
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

    const args = makeArgs(api, logger, { memo: 'Failed topic' });

    await expect(topicCreate(args)).rejects.toThrow(TransactionError);
  });

  test('throws when topicCreate throws', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveTopic: jest.fn() }));

    const { topicTransactions, txSign, txExecute, networkMock, kms, alias } =
      makeApiMocks({
        topicCreateImpl: jest.fn().mockImplementation(() => {
          throw new NetworkError('network error');
        }),
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

    const args = makeArgs(api, logger, { memo: 'Error topic' });

    await expect(topicCreate(args)).rejects.toThrow('network error');
  });
});
