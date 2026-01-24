/**
 * Batch HBAR Transfer Handler Unit Tests
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { batchHbarTransferHandler } from '@/plugins/batch/commands/hbar-transfer/handler';

import { makeApiMock, makeCommandArgs } from './helpers/mocks';

describe('batch hbar-transfer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writeTestFile = (filename: string, content: string): string => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  test('validates CSV and reports errors for invalid data', async () => {
    const filePath = writeTestFile(
      'invalid.csv',
      'to,amount,memo\ninvalid-account,100,Test\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('CSV validation failed');
  });

  test('dry run validates without executing transfers', async () => {
    const filePath = writeTestFile(
      'valid.csv',
      'to,amount,memo\n0.0.12345,100,Test\n0.0.12346,200,Test2\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath, dryRun: true },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.dryRun).toBe(true);
    expect(output.totalTransfers).toBe(2);
    expect(output.successCount).toBe(2);
    // Verify no actual transfers were executed
    expect(api.hbar.transferTinybar).not.toHaveBeenCalled();
  });

  test('executes transfers successfully', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,100,Payment 1\n0.0.12346,200,Payment 2\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.totalTransfers).toBe(2);
    expect(output.successCount).toBe(2);
    expect(output.failedCount).toBe(0);
    expect(api.hbar.transferTinybar).toHaveBeenCalledTimes(2);
  });

  test('stops on error by default', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,100,OK\n0.0.12346,200,Will fail\n0.0.12347,300,Not reached\n',
    );

    const api = makeApiMock({
      txExecution: {
        signAndExecuteWith: jest
          .fn()
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.111',
            receipt: { status: { status: 'SUCCESS' } },
          })
          .mockResolvedValueOnce({
            success: false,
            receipt: { status: { status: 'INSUFFICIENT_PAYER_BALANCE' } },
          }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    const output = JSON.parse(result.outputJson as string);
    expect(output.successCount).toBe(1);
    expect(output.failedCount).toBe(1);
    // Third transfer was not attempted
    expect(output.results).toHaveLength(2);
  });

  test('continues on error when flag is set', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,100,OK\n0.0.12346,200,Will fail\n0.0.12347,300,Should run\n',
    );

    const api = makeApiMock({
      txExecution: {
        signAndExecuteWith: jest
          .fn()
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.111',
            receipt: { status: { status: 'SUCCESS' } },
          })
          .mockResolvedValueOnce({
            success: false,
            receipt: { status: { status: 'INSUFFICIENT_PAYER_BALANCE' } },
          })
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.333',
            receipt: { status: { status: 'SUCCESS' } },
          }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, continueOnError: true },
    });

    const result = await batchHbarTransferHandler(args);

    // Still fails because there were failures
    expect(result.status).toBe(Status.Failure);
    const output = JSON.parse(result.outputJson as string);
    expect(output.successCount).toBe(2);
    expect(output.failedCount).toBe(1);
    expect(output.results).toHaveLength(3);
  });

  test('skips self-transfers', async () => {
    const filePath = writeTestFile(
      'self-transfer.csv',
      'to,amount,memo\n0.0.1000,100,Self transfer\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.skippedCount).toBe(1);
    expect(output.results[0].status).toBe('skipped');
    expect(api.hbar.transferTinybar).not.toHaveBeenCalled();
  });

  test('returns failure for empty CSV', async () => {
    const filePath = writeTestFile('empty.csv', 'to,amount,memo\n');

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath },
    });

    const result = await batchHbarTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'must contain a header row and at least one data row',
    );
  });
});
