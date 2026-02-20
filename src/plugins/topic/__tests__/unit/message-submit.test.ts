import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';
import type { SubmitMessageOutput } from '@/plugins/topic/commands/submit-message/output';
import type { TopicData } from '@/plugins/topic/schema';

import {
  makeAliasMock,
  makeArgs,
  makeConfigMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { submitMessage } from '@/plugins/topic/commands/submit-message/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeTopicData = (overrides: Partial<TopicData> = {}): TopicData => ({
  name: 'test-topic',
  topicId: '0.0.1234',
  memo: 'Test topic',
  network: SupportedNetwork.TESTNET,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeApiMocks = ({
  submitMessageImpl,
  signAndExecuteImpl,
  signAndExecuteWithImpl,
  signAndExecuteContractCreateFlowWithImpl,
  freezeTransactionImpl,
  network = 'testnet',
}: {
  submitMessageImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  signAndExecuteWithImpl?: jest.Mock;
  signAndExecuteContractCreateFlowWithImpl?: jest.Mock;
  freezeTransactionImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const topicTransactions = {
    createTopic: jest.fn(),
    submitMessage: submitMessageImpl || jest.fn(),
  };

  const mockTransaction = {
    sign: jest.fn().mockResolvedValue({
      sign: jest.fn(),
    }),
  };

  const signing = {
    signAndExecute: signAndExecuteImpl || jest.fn(),
    signAndExecuteWith: signAndExecuteWithImpl || jest.fn(),
    signAndExecuteContractCreateFlowWith:
      signAndExecuteContractCreateFlowWithImpl || jest.fn(),
    sign: jest.fn(),
    execute: jest.fn(),
    getStatus: jest.fn(),
    freezeTransaction:
      freezeTransactionImpl || jest.fn().mockReturnValue(mockTransaction),
  };

  const networkMock = makeNetworkMock(network);
  const alias = makeAliasMock();

  return { topicTransactions, signing, networkMock, alias };
};

describe('topic plugin - message-submit command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits message successfully without submit key', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
      memo: 'Test topic',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({
      submitMessageImpl: jest.fn().mockReturnValue({
        transaction: {},
      }),
      signAndExecuteImpl: jest.fn().mockResolvedValue({
        transactionId: 'tx-123',
        success: true,
        topicSequenceNumber: 5,
        receipt: { status: { status: 'success' } },
      } as TransactionResult),
      signAndExecuteContractCreateFlowWithImpl: jest.fn(),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Hello, World!',
    });

    const result = await submitMessage(args);

    const output = result.result as SubmitMessageOutput;
    expect(output.topicId).toBe('0.0.1234');
    expect(output.message).toBe('Hello, World!');
    expect(output.sequenceNumber).toBe(5);
    expect(output.transactionId).toBe('tx-123');

    expect(loadTopicMock).toHaveBeenCalledWith('0.0.1234');
    expect(topicTransactions.submitMessage).toHaveBeenCalledWith({
      topicId: '0.0.1234',
      message: 'Hello, World!',
    });
  });

  test('submits message successfully with signer option', async () => {
    const logger = makeLogger();
    const submitKeyRefId = 'kr_submit123';
    const topicData = makeTopicData({
      topicId: '0.0.5678',
      memo: 'Test topic with key',
      submitKeyRefId,
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const keyResolverMock = {
      getOrInitKey: jest.fn().mockResolvedValue({
        publicKey: '02abc123',
        accountId: '0.0.999',
        keyRefId: submitKeyRefId,
      }),
      getOrInitKeyWithFallback: jest.fn().mockResolvedValue({
        publicKey: '02abc123',
        accountId: '0.0.999',
        keyRefId: submitKeyRefId,
      }),
    };

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({
      submitMessageImpl: jest.fn().mockReturnValue({
        transaction: {},
      }),
      signAndExecuteWithImpl: jest.fn().mockResolvedValue({
        transactionId: 'tx-456',
        success: true,
        topicSequenceNumber: 10,
        receipt: { status: { status: 'success' } },
      } as TransactionResult),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
      keyResolver: keyResolverMock as KeyResolverService,
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      message: 'Signed message',
      signer: 'my-account-alias',
    });

    const result = await submitMessage(args);

    const output = result.result as SubmitMessageOutput;
    expect(output.sequenceNumber).toBe(10);

    expect(signing.signAndExecuteWith).toHaveBeenCalledWith({}, [
      submitKeyRefId,
    ]);
  });

  test('throws NotFoundError when topic not found', async () => {
    const logger = makeLogger();
    const loadTopicMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.9999',
      message: 'Test message',
    });

    await expect(submitMessage(args)).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError when signer is not authorized', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
      submitKeyRefId: 'kr_correct_submit',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const keyResolverMock = {
      getOrInitKey: jest.fn().mockResolvedValue({
        publicKey: '02abc123',
        accountId: '0.0.999',
        keyRefId: 'kr_wrong_submit',
      }),
    };

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
      keyResolver: keyResolverMock as KeyResolverService,
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Test message',
      signer: 'wrong-signer',
    });

    await expect(submitMessage(args)).rejects.toThrow(ValidationError);
  });

  test('throws TransactionError when signAndExecute returns failure', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({
      submitMessageImpl: jest.fn().mockReturnValue({
        transaction: {},
      }),
      signAndExecuteImpl: jest.fn().mockResolvedValue({
        transactionId: 'tx-123',
        success: false,
        receipt: { status: { status: 'success' } },
      } as TransactionResult),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Failed message',
    });

    await expect(submitMessage(args)).rejects.toThrow(TransactionError);
  });

  test('throws when submitMessage throws', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({
      submitMessageImpl: jest.fn().mockImplementation(() => {
        throw new Error('network error');
      }),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Error message',
    });

    await expect(submitMessage(args)).rejects.toThrow('network error');
  });
});
