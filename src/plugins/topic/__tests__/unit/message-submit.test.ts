import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';

import { MOCK_TOPIC_SUBMIT_KEY_REF_ID } from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeAliasMock,
  makeArgs,
  makeConfigMock,
  makeLogger,
  makeNetworkMock,
  makeTopicData,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NetworkError,
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TopicSubmitMessageOutputSchema } from '@/plugins/topic/commands/submit-message';
import { topicSubmitMessage } from '@/plugins/topic/commands/submit-message/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeApiMocks = ({
  topicSubmitMessageImpl,
  executeImpl,
  executeContractCreateFlowImpl,
  network = 'testnet',
}: {
  topicSubmitMessageImpl?: jest.Mock;
  executeImpl?: jest.Mock;
  executeContractCreateFlowImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const topicTransactions = {
    createTopic: jest.fn(),
    submitMessage: topicSubmitMessageImpl || jest.fn(),
    deleteTopic: jest.fn(),
  };

  const txSign = {
    sign: jest.fn().mockResolvedValue(createMockTransaction()),
    signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
  };

  const txExecute = {
    execute: executeImpl || jest.fn(),
    executeContractCreateFlow: executeContractCreateFlowImpl || jest.fn(),
  };

  const networkMock = makeNetworkMock(network);
  const alias = makeAliasMock();

  return { topicTransactions, txSign, txExecute, networkMock, alias };
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

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({
        topicSubmitMessageImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.1234@1234567890.000000000',
          success: true,
          topicSequenceNumber: 5,
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
        executeContractCreateFlowImpl: jest.fn(),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Hello, World!',
    });

    const result = await topicSubmitMessage(args);

    const output = assertOutput(result.result, TopicSubmitMessageOutputSchema);
    expect(output.topicId).toBe('0.0.1234');
    expect(output.message).toBe('Hello, World!');
    expect(output.sequenceNumber).toBe(5);
    expect(output.transactionId).toBe('0.0.1234@1234567890.000000000');

    expect(loadTopicMock).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:0.0.1234`,
    );
    expect(topicTransactions.submitMessage).toHaveBeenCalledWith({
      topicId: '0.0.1234',
      message: 'Hello, World!',
    });
  });

  test('submits message successfully with signer option', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.5678',
      memo: 'Test topic with key',
      submitKeyRefIds: [MOCK_TOPIC_SUBMIT_KEY_REF_ID],
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const keyResolverMock = {
      resolveSigningKey: jest.fn().mockResolvedValue({
        publicKey: '02abc123',
        accountId: '0.0.999',
        keyRefId: MOCK_TOPIC_SUBMIT_KEY_REF_ID,
      }),
      resolveAccountCredentials: jest.fn(),
      resolveDestination: jest.fn(),
      getPublicKey: jest.fn(),
    };

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({
        topicSubmitMessageImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        executeImpl: jest.fn().mockResolvedValue({
          transactionId: '0.0.5678@1234567890.000000000',
          success: true,
          topicSequenceNumber: 10,
          receipt: { status: { status: 'success' } },
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      alias: alias as AliasService,
      logger,
      keyResolver: keyResolverMock as KeyResolverService,
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      message: 'Signed message',
      signer: ['my-account-alias'],
    });

    const result = await topicSubmitMessage(args);

    const output = assertOutput(result.result, TopicSubmitMessageOutputSchema);
    expect(output.sequenceNumber).toBe(10);

    expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
  });

  test('throws NotFoundError when topic not found', async () => {
    const logger = makeLogger();
    const loadTopicMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.9999',
      message: 'Test message',
    });

    await expect(topicSubmitMessage(args)).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError when valid signers do not meet threshold after filtering unauthorized', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
      submitKeyRefIds: ['kr_a', 'kr_b'],
      submitKeyThreshold: 2,
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const keyResolverMock = {
      resolveSigningKey: jest
        .fn()
        .mockResolvedValueOnce({
          publicKey: '02abc123',
          accountId: '0.0.999',
          keyRefId: 'kr_a',
        })
        .mockResolvedValueOnce({
          publicKey: '02wrong',
          accountId: '0.0.888',
          keyRefId: 'kr_unauthorized',
        }),
      resolveAccountCredentials: jest.fn(),
      resolveDestination: jest.fn(),
      getPublicKey: jest.fn(),
    };

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({});

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      alias: alias as AliasService,
      logger,
      keyResolver: keyResolverMock as KeyResolverService,
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Test message',
      signer: ['valid-signer', 'unauthorized-signer'],
    });

    await expect(topicSubmitMessage(args)).rejects.toThrow(ValidationError);
  });

  test('throws TransactionError when execute returns failure', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({
        topicSubmitMessageImpl: jest.fn().mockReturnValue({
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Failed message',
    });

    await expect(topicSubmitMessage(args)).rejects.toThrow(TransactionError);
  });

  test('throws when topicSubmitMessage throws', async () => {
    const logger = makeLogger();
    const topicData = makeTopicData({
      topicId: '0.0.1234',
    });
    const loadTopicMock = jest.fn().mockReturnValue(topicData);
    MockedHelper.mockImplementation(() => ({ loadTopic: loadTopicMock }));

    const { topicTransactions, txSign, txExecute, networkMock, alias } =
      makeApiMocks({
        topicSubmitMessageImpl: jest.fn().mockImplementation(() => {
          throw new NetworkError('network error');
        }),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txSign,
      txExecute,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.1234',
      message: 'Error message',
    });

    await expect(topicSubmitMessage(args)).rejects.toThrow('network error');
  });
});
