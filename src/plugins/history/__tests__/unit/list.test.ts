import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ListHistoryOutput } from '@/plugins/history/commands/list';

import '@/core/utils/json-serialize';

import { makeArgs, makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { listHistoryHandler } from '@/plugins/history/commands/list/handler';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('history plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns transaction history for an account by ID', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            transaction_id: '0.0.12345@1706035200.123456789',
            consensus_timestamp: '1706035200.123456789',
            charged_tx_fee: 100000,
            result: 'SUCCESS',
            name: 'CRYPTOTRANSFER',
            transfers: [
              { account: '0.0.12345', amount: -1000000 },
              { account: '0.0.67890', amount: 1000000 },
            ],
          },
        ],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
      limit: 25,
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListHistoryOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.12345');
    expect(output.network).toBe('testnet');
    expect(output.totalCount).toBe(1);
    expect(output.transactions).toHaveLength(1);
    expect(output.transactions[0].transactionId).toBe(
      '0.0.12345@1706035200.123456789',
    );
    expect(output.transactions[0].type).toBe('CRYPTOTRANSFER');
    expect(output.transactions[0].result).toBe('SUCCESS');
    expect(output.transactions[0].transfers).toHaveLength(2);
  });

  test('returns transaction history for a stored account alias', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            transaction_id: '0.0.99999@1706035200.000000000',
            consensus_timestamp: '1706035200.000000000',
            charged_tx_fee: 50000,
            result: 'SUCCESS',
            name: 'TOKENASSOCIATE',
          },
        ],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'my-account',
          type: 'account',
          network: 'testnet',
          entityId: '0.0.99999',
        }),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: 'my-account',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListHistoryOutput = JSON.parse(result.outputJson!);
    expect(output.accountId).toBe('0.0.99999');
  });

  test('applies limit parameter correctly', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
      limit: 10,
    });

    await listHistoryHandler(args);

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
  });

  test('applies type filter correctly', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
      type: 'cryptotransfer',
    });

    await listHistoryHandler(args);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('transactiontype=CRYPTOTRANSFER'),
    );
  });

  test('applies result filter correctly', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
      result: 'success',
    });

    await listHistoryHandler(args);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('result=success'),
    );
  });

  test('decodes memo from base64', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    const memoText = 'Hello World';
    const memoBase64 = Buffer.from(memoText).toString('base64');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            transaction_id: '0.0.12345@1706035200.123456789',
            consensus_timestamp: '1706035200.123456789',
            charged_tx_fee: 100000,
            result: 'SUCCESS',
            name: 'CRYPTOTRANSFER',
            memo_base64: memoBase64,
          },
        ],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output: ListHistoryOutput = JSON.parse(result.outputJson!);
    expect(output.transactions[0].memo).toBe(memoText);
  });

  test('includes token transfers in output', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          {
            transaction_id: '0.0.12345@1706035200.123456789',
            consensus_timestamp: '1706035200.123456789',
            charged_tx_fee: 100000,
            result: 'SUCCESS',
            name: 'TOKENTRANSFERS',
            token_transfers: [
              { account: '0.0.12345', amount: -500, token_id: '0.0.77777' },
              { account: '0.0.67890', amount: 500, token_id: '0.0.77777' },
            ],
          },
        ],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output: ListHistoryOutput = JSON.parse(result.outputJson!);
    expect(output.transactions[0].tokenTransfers).toHaveLength(2);
    expect(output.transactions[0].tokenTransfers![0].tokenId).toBe('0.0.77777');
  });

  test('returns failure for invalid account', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: 'invalid-account',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Account not found');
  });

  test('returns failure when fetch fails', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to fetch transactions');
  });

  test('uses correct base URL for mainnet', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('mainnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
    });

    await listHistoryHandler(args);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('mainnet-public.mirrornode.hedera.com'),
    );
  });

  test('returns empty transactions array when none found', async () => {
    const logger = makeLogger();
    const networkMock = makeNetworkMock('testnet');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [],
      }),
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      } as unknown as AliasService,
    };

    const args = makeArgs(api, logger, {
      account: '0.0.12345',
    });

    const result = await listHistoryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output: ListHistoryOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(0);
    expect(output.transactions).toHaveLength(0);
  });
});
