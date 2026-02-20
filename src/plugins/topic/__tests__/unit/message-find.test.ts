import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { FindMessagesOutput } from '@/plugins/topic/commands/find-message/output';

import { ZodError } from 'zod';

import {
  createMirrorNodeMock,
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { findMessage } from '@/plugins/topic/commands/find-message/handler';

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
  const mirror: jest.Mocked<HederaMirrornodeService> = createMirrorNodeMock();
  mirror.getTopicMessage = getTopicMessageImpl || jest.fn();
  mirror.getTopicMessages = getTopicMessagesImpl || jest.fn();

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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 5,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(3);
    expect(output.messages).toHaveLength(3);

    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(6);
    expect(sequenceNumbers).toContain(7);
    expect(sequenceNumbers).toContain(8);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'gt',
          value: 5,
        },
      ],
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 5,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(2);
    expect(output.messages).toHaveLength(2);

    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(5);
    expect(sequenceNumbers).toContain(6);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'gte',
          value: 5,
        },
      ],
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceLt: 3,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(2);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'lt',
          value: 3,
        },
      ],
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceLte: 3,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(1);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'lte',
          value: 3,
        },
      ],
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceEq: 5,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(1);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'eq',
          value: 5,
        },
      ],
    });
  });

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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(3);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filter: undefined,
    });
  });

  test('throws when getTopicMessages throws', async () => {
    const logger = makeLogger();

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest
        .fn()
        .mockRejectedValue(new Error('network error')),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 5,
    });

    await expect(findMessage(args)).rejects.toThrow('network error');
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 1000,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(0);
    expect(output.messages).toEqual([]);
  });

  test('throws ZodError when contradictory filters are provided', async () => {
    const logger = makeLogger();

    const { mirror, networkMock, alias } = makeApiMocks({
      getTopicMessagesImpl: jest.fn(),
    });

    const api: Partial<CoreApi> = {
      mirror,
      network: networkMock,
      alias: alias as AliasService,
      logger,
    };

    const args1 = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceEq: 5,
      sequenceGt: 3,
    });

    await expect(findMessage(args1)).rejects.toThrow(ZodError);
    expect(mirror.getTopicMessages).not.toHaveBeenCalled();

    const args2 = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 10,
      sequenceLt: 5,
    });

    await expect(findMessage(args2)).rejects.toThrow(ZodError);
    expect(mirror.getTopicMessages).not.toHaveBeenCalled();

    const args3 = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 5,
      sequenceLt: 5,
    });

    await expect(findMessage(args3)).rejects.toThrow(ZodError);
    expect(mirror.getTopicMessages).not.toHaveBeenCalled();
  });

  test('finds messages with multiple non-contradictory filters', async () => {
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGt: 5,
      sequenceLt: 9,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(3);
    expect(output.messages).toHaveLength(3);

    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(6);
    expect(sequenceNumbers).toContain(7);
    expect(sequenceNumbers).toContain(8);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'gt',
          value: 5,
        },
        {
          field: 'sequenceNumber',
          operation: 'lt',
          value: 9,
        },
      ],
    });
  });

  test('finds messages with gte and lte filters', async () => {
    const logger = makeLogger();
    const mockMessages = [
      makeTopicMessage(5, 'Message 5'),
      makeTopicMessage(6, 'Message 6'),
      makeTopicMessage(7, 'Message 7'),
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
      alias: alias as AliasService,
      logger,
    };

    const args = makeArgs(api, logger, {
      topic: '0.0.5678',
      sequenceGte: 5,
      sequenceLte: 7,
    });

    const result = await findMessage(args);

    const output = result.result as FindMessagesOutput;
    expect(output.totalCount).toBe(3);

    const sequenceNumbers = output.messages.map((m) => m.sequenceNumber);
    expect(sequenceNumbers).toContain(5);
    expect(sequenceNumbers).toContain(6);
    expect(sequenceNumbers).toContain(7);

    expect(mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.5678',
      filters: [
        {
          field: 'sequenceNumber',
          operation: 'gte',
          value: 5,
        },
        {
          field: 'sequenceNumber',
          operation: 'lte',
          value: 7,
        },
      ],
    });
  });
});
