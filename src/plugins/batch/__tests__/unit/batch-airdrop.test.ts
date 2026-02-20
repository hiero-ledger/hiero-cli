import '@/core/utils/json-serialize';

import * as fs from 'node:fs';

import { MOCK_TX_ID } from '@/__tests__/mocks/fixtures';
import { makeArgs, makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { batchAirdrop } from '@/plugins/batch/commands/airdrop';

jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock only TokenAirdropTransaction, preserve the rest of the SDK
jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  const mockAddTokenTransfer = jest.fn().mockReturnThis();
  return {
    ...actual,
    TokenAirdropTransaction: jest.fn().mockImplementation(() => ({
      addTokenTransfer: mockAddTokenTransfer,
    })),
  };
});

describe('batch plugin - airdrop command (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  function buildArgs(
    overrides: Record<string, unknown> = {},
    apiOverrides: Record<string, unknown> = {},
  ) {
    const logger = makeLogger();
    const network = makeNetworkMock('testnet');

    const txExecution = {
      signAndExecuteWith: jest.fn().mockResolvedValue({
        success: true,
        transactionId: MOCK_TX_ID,
        receipt: { status: { status: 'SUCCESS' } },
      }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    const mirror = {
      getTokenInfo: jest.fn().mockResolvedValue({
        decimals: '8',
        type: 'FUNGIBLE_COMMON',
      }),
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    };

    const alias = {
      resolve: jest.fn().mockImplementation((name: string, type: string) => {
        if (name === 'my-token' && type === 'token') {
          return { entityId: '0.0.99999' };
        }
        if (name === 'alice' && type === 'account') {
          return { entityId: '0.0.200000' };
        }
        return null;
      }),
      register: jest.fn(),
      resolveOrThrow: jest.fn(),
      resolveByEvmAddress: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      availableOrThrow: jest.fn(),
      clear: jest.fn(),
    };

    const api = {
      network,
      txExecution,
      mirror,
      alias,
      ...apiOverrides,
    };

    return makeArgs(api, logger, {
      file: '/test/airdrop.csv',
      token: '0.0.99999',
      dryRun: false,
      ...overrides,
    });
  }

  test('executes batch airdrop successfully from CSV', async () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount\n0.0.12345,100\n0.0.67890,50',
    );

    const args = buildArgs();

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.total).toBe(2);
    expect(output.succeeded).toBe(2);
    expect(output.failed).toBe(0);
    expect(output.dryRun).toBe(false);
    expect(output.tokenId).toBe('0.0.99999');
    expect(output.results[0].status).toBe('success');
    expect(output.results[0].transactionId).toBe(MOCK_TX_ID);
  });

  test('dry run validates without executing', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,100');

    const args = buildArgs({ dryRun: true });

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.dryRun).toBe(true);
    expect(output.total).toBe(1);

    expect(args.api.txExecution.signAndExecuteWith).not.toHaveBeenCalled();
  });

  test('returns failure when CSV file is missing', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const args = buildArgs();

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('CSV file not found');
  });

  test('returns failure when CSV has invalid amounts', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,abc');

    const args = buildArgs();

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('invalid amount');
  });

  test('resolves account aliases in to field', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\nalice,100');

    const args = buildArgs();

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.results[0].status).toBe('success');
  });

  test('handles partial failures', async () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount\n0.0.12345,100\n0.0.67890,50',
    );

    const txExecution = {
      signAndExecuteWith: jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          transactionId: MOCK_TX_ID,
          receipt: { status: { status: 'SUCCESS' } },
        })
        .mockResolvedValueOnce({
          success: false,
          receipt: { status: { status: 'INSUFFICIENT_SENDER_BALANCE' } },
        }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    const args = buildArgs({}, { txExecution });

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Success);
    expect(result.errorMessage).toContain('1 of 2 airdrops failed');

    const output = JSON.parse(result.outputJson!);
    expect(output.succeeded).toBe(1);
    expect(output.failed).toBe(1);
  });

  test('returns failure when token cannot be resolved', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,100');

    const alias = {
      resolve: jest.fn().mockReturnValue(null),
      register: jest.fn(),
      resolveOrThrow: jest.fn(),
      resolveByEvmAddress: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      availableOrThrow: jest.fn(),
      clear: jest.fn(),
    };

    const args = buildArgs({ token: 'nonexistent-token' }, { alias });

    const result = await batchAirdrop(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to resolve token');
  });
});
