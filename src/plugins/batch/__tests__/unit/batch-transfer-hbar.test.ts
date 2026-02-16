import '@/core/utils/json-serialize';

import * as fs from 'node:fs';

import { MOCK_TX_ID } from '@/__tests__/mocks/fixtures';
import { makeArgs, makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { batchTransferHbar } from '@/plugins/batch/commands/transfer-hbar';

// Mock node:fs for CSV parsing
jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('batch plugin - transfer-hbar command (unit)', () => {
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

    const hbar = {
      transferTinybar: jest.fn().mockResolvedValue({
        transaction: 'mock-transaction',
      }),
    };

    const txExecution = {
      signAndExecuteWith: jest.fn().mockResolvedValue({
        success: true,
        transactionId: MOCK_TX_ID,
        receipt: { status: { status: 'SUCCESS' } },
      }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

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

    const api = {
      network,
      hbar,
      txExecution,
      alias,
      ...apiOverrides,
    };

    return makeArgs(api, logger, {
      file: '/test/transfers.csv',
      dryRun: false,
      ...overrides,
    });
  }

  test('executes batch HBAR transfers successfully from CSV', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,10\n0.0.67890,5');

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.total).toBe(2);
    expect(output.succeeded).toBe(2);
    expect(output.failed).toBe(0);
    expect(output.dryRun).toBe(false);
    expect(output.results).toHaveLength(2);
    expect(output.results[0].status).toBe('success');
    expect(output.results[0].transactionId).toBe(MOCK_TX_ID);
  });

  test('dry run validates without executing transactions', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,10\n0.0.67890,5');

    const args = buildArgs({ dryRun: true });

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.total).toBe(2);
    expect(output.succeeded).toBe(2);
    expect(output.failed).toBe(0);
    expect(output.dryRun).toBe(true);

    // No transactions should have been submitted
    expect(args.api.hbar.transferTinybar).not.toHaveBeenCalled();
  });

  test('returns failure when CSV file is missing', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('CSV file not found');
  });

  test('returns failure when CSV has missing required headers', async () => {
    mockFs.readFileSync.mockReturnValue('name,value\nfoo,bar');

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('missing required headers');
  });

  test('returns failure when CSV has invalid amount', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,abc');

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('invalid amount');
  });

  test('returns failure when a row has empty to field', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n,10');

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('missing "to" field');
  });

  test('handles partial failures gracefully', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,10\n0.0.67890,5');

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
          receipt: { status: { status: 'INSUFFICIENT_PAYER_BALANCE' } },
        }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    const args = buildArgs({}, { txExecution });

    const result = await batchTransferHbar(args);
    // Partial success should still return Success with error message
    expect(result.status).toBe(Status.Success);
    expect(result.errorMessage).toContain('1 of 2 transfers failed');

    const output = JSON.parse(result.outputJson!);
    expect(output.succeeded).toBe(1);
    expect(output.failed).toBe(1);
    expect(output.results[0].status).toBe('success');
    expect(output.results[1].status).toBe('failed');
  });

  test('resolves account aliases in to field', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\nalice,10');

    const alias = {
      resolve: jest.fn().mockImplementation((name: string, type: string) => {
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

    const args = buildArgs({}, { alias });

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Success);

    const output = JSON.parse(result.outputJson!);
    expect(output.results[0].status).toBe('success');
  });

  test('uses memo from CSV row when available', async () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount,memo\n0.0.12345,10,test-memo',
    );

    const args = buildArgs();

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Success);

    expect(args.api.hbar.transferTinybar).toHaveBeenCalledWith(
      expect.objectContaining({
        memo: 'test-memo',
      }),
    );
  });

  test('returns full failure when all transfers fail', async () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,10');

    const txExecution = {
      signAndExecuteWith: jest.fn().mockResolvedValue({
        success: false,
        receipt: { status: { status: 'INSUFFICIENT_PAYER_BALANCE' } },
      }),
      signAndExecute: jest.fn(),
      signAndExecuteContractCreateFlowWith: jest.fn(),
    };

    const args = buildArgs({}, { txExecution });

    const result = await batchTransferHbar(args);
    expect(result.status).toBe(Status.Failure);
  });
});
