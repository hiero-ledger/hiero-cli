import { findMessage } from '../../commands/find-message/handler';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import type { HederaMirrornodeService } from '../../../../core/services/mirrornode/hedera-mirrornode-service.interface';
import type { FindMessagesOutput } from '../../commands/find-message/output';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
  makeNetworkMock,
  makeAliasMock,
} from '../../../../__tests__/mocks/mocks';

const makeTopicMessage = (sequenceNumber: number, message: string) => ({
  consensus_timestamp: '1234567890.123456789',
  message: Buffer.from(message).toString('base64'),
  sequence_number: sequenceNumber,
  topic_id: '0.0.5678',
  running_hash: 'hash',
});

const makeApiMocks = ({
  getTopicMessageImpl,
  getTopicMessagesImpl,
  network = 'testnet',
}: {
  getTopicMessageImpl?: jest.Mock;
  getTopicMessagesImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}) => {
  const mirror: jest.Mocked<HederaMirrornodeService> = {
    getTopicMessage: getTopicMessageImpl || jest.fn(),
    getTopicMessages: getTopicMessagesImpl || jest.fn(),
    getAccount: jest.fn(),
    getAccountHBarBalance: jest.fn(),
    getAccountTokenBalances: jest.fn(),
    getTokenInfo: jest.fn(),
    getTopicInfo: jest.fn(),
    getTransactionRecord: jest.fn(),
    getContractInfo: jest.fn(),
    getPendingAirdrops: jest.fn(),
    getOutstandingAirdrops: jest.fn(),
    getExchangeRate: jest.fn(),
  };

  const networkMock = makeNetworkMock(network);
  const alias = makeAliasMock();

  return { mirror, networkMock, alias };
};

describe('topic plugin - message-find command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('finds messages with greater than filter', async () => {
    const logger = makeLogger();
    const mockMessages = [
      makeTopicMessage(6, 'Message 6'),
      makeTopicMessage(7, 'Message 7'),
      makeTopicMessage(8, 'Message 8'),
    ];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 5,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(3);
    expect(output.messages).toHaveLength(3);

    // Check that all expected messages are present (order may vary)
    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(6);
    expect(sequenceNumbers).toContain(7);
    expect(sequenceNumbers).toContain(8);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'gt',
        value: 5,
      },
    });
  });

  test('finds messages with greater than or equal filter', async () => {
    const logger = makeLogger();
    const mockMessages = [
      makeTopicMessage(5, 'Message 5'),
      makeTopicMessage(6, 'Message 6'),
    ];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 5,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(2);
    expect(output.messages).toHaveLength(2);

    // Check that expected messages are present (order may vary)
    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(5);
    expect(sequenceNumbers).toContain(6);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'gte',
        value: 5,
      },
    });
  });

  test('finds messages with less than filter', async () => {
    const logger = makeLogger();
    const mockMessages = [
      makeTopicMessage(1, 'Message 1'),
      makeTopicMessage(2, 'Message 2'),
    ];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceLt: 3,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(2);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'lt',
        value: 3,
      },
    });
  });

  test('finds messages with less than or equal filter', async () => {
    const logger = makeLogger();
    const mockMessages = [makeTopicMessage(3, 'Message 3')];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceLte: 3,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(1);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'lte',
        value: 3,
      },
    });
  });

  test('finds messages with equal filter', async () => {
    const logger = makeLogger();
    const mockMessages = [makeTopicMessage(5, 'Message 5')];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceEq: 5,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(1);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'eq',
        value: 5,
      },
    });
  });

  // NOTE: Validation for missing sequence parameters is now handled by Zod schema (FindMessageInputSchema)
  // This test is no longer needed as the validation happens at the schema level before reaching the handler

  test('find all messages when no filter provided', async () => {
    const logger = makeLogger();
    const mockMessages = [
      makeTopicMessage(1, 'Message 1'),
      makeTopicMessage(2, 'Message 2'),
      makeTopicMessage(3, 'Message 3'),
    ];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(3);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: undefined,
    });
  });

  test('returns failure when getTopicMessages throws', async () => {
    const logger = makeLogger();

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest
        .fn()
        .mockRejectedValue(new Error('network error')),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 5,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to find messages');
    expect(result.errorMessage).toContain('network error');
  });

  test('handles empty message list', async () => {
    const logger = makeLogger();

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: [],
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 1000,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);
    const output: FindMessagesOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(0);
    expect(output.messages).toEqual([]);
  });

  test('uses first filter when multiple filters are provided', async () => {
    const logger = makeLogger();
    const mockMessages = [makeTopicMessage(6, 'Message 6')];

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn().mockResolvedValue({
        messages: mockMessages,
        links: { next: null },
      }),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as any,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 5,
      sequenceLt: 10,
    });

    const result = await findMessage(args);

    expect(result.status).toBe(Status.Success);

    // Should use the first non-empty filter (gt)
    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: {
        field: 'sequenceNumber',
        operation: 'gt',
        value: 5,
      },
    });
  });
});
