import { createTopic } from '../../commands/create/handler';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core';
import type { TransactionResult } from '../../../../core';
import type { CreateTopicOutput } from '../../commands/create';
import {
  makeLogger,
  makeArgs,
  makeNetworkMock,
  makeKmsMock,
  makeAliasMock,
} from '../../../../core/shared/__tests__/helpers/mocks';
import { Status, KeyAlgorithm } from '../../../../core/shared/constants';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const makeApiMocks = ({
  createTopicImpl,
  signAndExecuteImpl,
  signAndExecuteWithImpl,
  network = 'testnet',
}: {
  createTopicImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  signAndExecuteWithImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const topicTransactions = {
    createTopic: createTopicImpl || jest.fn(),
    submitMessage: jest.fn(),
  };

  const signing = {
    signAndExecute: signAndExecuteImpl || jest.fn(),
    signAndExecuteWith: signAndExecuteWithImpl || jest.fn(),
    sign: jest.fn(),
    execute: jest.fn(),
    getStatus: jest.fn(),
    freezeTransaction: jest.fn(),
    freezeTx: jest.fn().mockImplementation((transaction) => transaction),
  };

  const networkMock = makeNetworkMock(network);
  const kms = makeKmsMock();
  kms.importPrivateKey.mockImplementation((keyType: string, key: string) => ({
    keyRefId: `kr_${key.slice(-5)}`,
    publicKey: 'mock-public-key',
  }));
  const alias = makeAliasMock();

  return { topicTransactions, signing, networkMock, kms, alias };
};

describe('topic plugin - create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates topic successfully with memo', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-123',
          success: true,
          topicId: '0.0.9999',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      memo: 'Test topic memo',
    });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: CreateTopicOutput = JSON.parse(result.outputJson!);
    expect(output.topicId).toBe('0.0.9999');
    expect(output.memo).toBe('Test topic memo');
    expect(output.network).toBe('testnet');
    expect(output.transactionId).toBe('tx-123');

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: 'Test topic memo',
      adminKey: undefined,
      submitKey: undefined,
    });
    expect(signing.signAndExecute).toHaveBeenCalled();
    expect(saveTopicMock).toHaveBeenCalledWith(
      '0.0.9999',
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

    const adminKey = '302e020100300506032b657004220420admin';
    const submitKey = '302e020100300506032b657004220420submit';

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        signAndExecuteWithImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-456',
          success: true,
          topicId: '0.0.8888',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      memo: 'Test topic',
      adminKey,
      submitKey,
    });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: CreateTopicOutput = JSON.parse(result.outputJson!);
    expect(output.topicId).toBe('0.0.8888');
    expect(output.adminKeyPresent).toBe(true);
    expect(output.submitKeyPresent).toBe(true);

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: 'Test topic',
      adminKey,
      submitKey,
    });
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      adminKey,
    );
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      submitKey,
    );
    expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
      {},
      {
        keyRefId: 'kr_admin',
      },
    );
    expect(saveTopicMock).toHaveBeenCalledWith(
      '0.0.8888',
      expect.objectContaining({
        topicId: '0.0.8888',
        memo: 'Test topic',
        adminKeyRefId: 'kr_admin',
        submitKeyRefId: 'kr_ubmit',
        network: 'testnet',
      }),
    );
  });

  test('creates topic successfully without memo', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        signAndExecuteImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-789',
          success: true,
          topicId: '0.0.7777',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {});

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: CreateTopicOutput = JSON.parse(result.outputJson!);
    expect(output.topicId).toBe('0.0.7777');
    expect(output.memo).toBeUndefined();

    expect(topicTransactions.createTopic).toHaveBeenCalledWith({
      memo: undefined,
      adminKey: undefined,
      submitKey: undefined,
    });
    expect(saveTopicMock).toHaveBeenCalledWith(
      '0.0.7777',
      expect.objectContaining({
        topicId: '0.0.7777',
        memo: '(No memo)',
        network: 'testnet',
      }),
    );
  });

  test('returns failure when signAndExecute returns failure', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveTopic: jest.fn() }));

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
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
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, { memo: 'Failed topic' });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe('Failed to create topic');
  });

  test('returns failure when createTopic throws', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({ saveTopic: jest.fn() }));

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockImplementation(() => {
          throw new Error('network error');
        }),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, { memo: 'Error topic' });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to create topic');
    expect(result.errorMessage).toContain('network error');
  });

  test('creates topic with ECDSA admin key prefix', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const adminKey = 'ecdsa:302e020100300506032b657004220420admin';

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        signAndExecuteWithImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-ecdsa',
          success: true,
          topicId: '0.0.6666',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      memo: 'ECDSA topic',
      adminKey,
    });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Success);
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      '302e020100300506032b657004220420admin',
    );
  });

  test('creates topic with ED25519 admin and submit keys', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const adminKey = 'ed25519:302e020100300506032b657004220420admin';
    const submitKey = 'ed25519:302e020100300506032b657004220420submit';

    const { topicTransactions, signing, networkMock, kms, alias } =
      makeApiMocks({
        createTopicImpl: jest.fn().mockReturnValue({
          transaction: {},
        }),
        signAndExecuteWithImpl: jest.fn().mockResolvedValue({
          transactionId: 'tx-ed25519',
          success: true,
          topicId: '0.0.5555',
          receipt: {} as any,
        } as TransactionResult),
      });

    const api: Partial<CoreApi> = {
      topic: topicTransactions,
      txExecution: signing,
      network: networkMock,
      kms,
      alias: alias as any,
      state: {} as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      memo: 'ED25519 topic',
      adminKey,
      submitKey,
    });

    const result = await createTopic(args);

    expect(result.status).toBe(Status.Success);
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ED25519,
      '302e020100300506032b657004220420admin',
    );
    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ED25519,
      '302e020100300506032b657004220420submit',
    );
  });
});
