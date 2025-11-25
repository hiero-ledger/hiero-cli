import { submitMessage } from '../../commands/submit-message/handler';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import type { TopicData } from '../../schema';
import type { SubmitMessageOutput } from '../../commands/submit-message/output';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
  makeNetworkMock,
  makeAliasMock,
} from '../../../../core/shared/__tests__/helpers/mocks';

jest.mock('../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeTopicData = (overrides: Partial<TopicData> = {}): TopicData => ({
  name: 'test-topic',
  topicId: '0.0.1234',
  memo: 'Test topic',
  network: 'testnet',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeApiMocks = ({
  submitMessageImpl,
  signAndExecuteImpl,
  signAndExecuteWithImpl,
  freezeTransactionImpl,
  network = 'testnet',
}: {
  submitMessageImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  signAndExecuteWithImpl?: jest.Mock;
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
    sign: jest.fn(),
    execute: jest.fn(),
    getStatus: jest.fn(),
    freezeTransaction:
      freezeTransactionImpl || jest.fn().mockReturnValue(mockTransaction),
    freezeTx: jest.fn().mockImplementation((transaction) => transaction),
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
        receipt: {} as any,
      } as TransactionResult),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topicId: '0.0.1234',
      message: 'Hello, World!',
    });

    const result = await submitMessage(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: SubmitMessageOutput = JSON.parse(result.outputJson!);
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

  test('submits message successfully with submit key', async () => {
    const logger = makeLogger();
    const submitKeyRefId = 'kr_submit123';
    const topicData = makeTopicData({
      topicId: '0.0.5678',
      memo: 'Test topic with key',
      submitKeyRefId,
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({
      submitMessageImpl: jest.fn().mockReturnValue({
        transaction: {},
      }),
      signAndExecuteWithImpl: jest.fn().mockResolvedValue({
        transactionId: 'tx-456',
        success: true,
        topicSequenceNumber: 10,
        receipt: {} as any,
      } as TransactionResult),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topicId: '0.0.5678',
      message: 'Signed message',
    });

    const result = await submitMessage(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: SubmitMessageOutput = JSON.parse(result.outputJson!);
    expect(output.sequenceNumber).toBe(10);

    expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
      {},
      { keyRefId: submitKeyRefId },
    );
  });

  test('returns failure when topic not found', async () => {
    const logger = makeLogger();
    const loadTopicMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, signing, networkMock, alias } = makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topicId: '0.0.9999',
      message: 'Test message',
    });

    const result = await submitMessage(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Topic not found');
  });

  test('returns failure when signAndExecute returns failure', async () => {
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
        receipt: {} as any,
      } as TransactionResult),
    });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topicId: '0.0.1234',
      message: 'Failed message',
    });

    const result = await submitMessage(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe('Failed to submit message');
  });

  test('returns failure when submitMessage throws', async () => {
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
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topicId: '0.0.1234',
      message: 'Error message',
    });

    const result = await submitMessage(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to submit message');
    expect(result.errorMessage).toContain('network error');
  });
});
