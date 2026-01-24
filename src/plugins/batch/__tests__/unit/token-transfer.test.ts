/**
 * Batch Token Transfer Handler Unit Tests
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { batchTokenTransferHandler } from '@/plugins/batch/commands/token-transfer/handler';

import { makeApiMock, makeCommandArgs } from './helpers/mocks';

describe('batch token-transfer', () => {
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
      args: { file: filePath, token: '0.0.99999' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('CSV validation failed');
  });

  test('dry run validates without executing transfers', async () => {
    const filePath = writeTestFile(
      'valid.csv',
      'to,amount,memo\n0.0.12345,1000,Airdrop\n0.0.12346,500,Airdrop\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999', dryRun: true },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.dryRun).toBe(true);
    expect(output.totalTransfers).toBe(2);
    expect(output.successCount).toBe(2);
    expect(output.tokenId).toBe('0.0.99999');
    // Verify no actual transfers were executed
    expect(api.token.createTransferTransaction).not.toHaveBeenCalled();
  });

  test('executes transfers successfully', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,1000,Token 1\n0.0.12346,500,Token 2\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.totalTransfers).toBe(2);
    expect(output.successCount).toBe(2);
    expect(output.failedCount).toBe(0);
    expect(api.token.createTransferTransaction).toHaveBeenCalledTimes(2);
  });

  test('resolves token alias', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,1000,Test\n',
    );

    const api = makeApiMock({
      alias: {
        resolve: jest.fn().mockImplementation((alias, type) => {
          if (type === 'token' && alias === 'my-token') {
            return { entityId: '0.0.88888' };
          }
          return null;
        }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: 'my-token' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.tokenId).toBe('0.0.88888');
  });

  test('fails for invalid token ID', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,1000,Test\n',
    );

    const api = makeApiMock({
      alias: {
        resolve: jest.fn().mockReturnValue(null),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: 'nonexistent-token' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Invalid token');
  });

  test('stops on error by default', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,1000,OK\n0.0.12346,500,Fail\n0.0.12347,250,Not reached\n',
    );

    const api = makeApiMock({
      txExecution: {
        signAndExecuteWith: jest
          .fn()
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.111',
          })
          .mockResolvedValueOnce({
            success: false,
            receipt: { status: { status: 'TOKEN_NOT_ASSOCIATED_TO_ACCOUNT' } },
          }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    const output = JSON.parse(result.outputJson as string);
    expect(output.successCount).toBe(1);
    expect(output.failedCount).toBe(1);
    expect(output.results).toHaveLength(2);
  });

  test('continues on error when flag is set', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,1000,OK\n0.0.12346,500,Fail\n0.0.12347,250,OK\n',
    );

    const api = makeApiMock({
      txExecution: {
        signAndExecuteWith: jest
          .fn()
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.111',
          })
          .mockResolvedValueOnce({
            success: false,
            receipt: { status: { status: 'TOKEN_NOT_ASSOCIATED_TO_ACCOUNT' } },
          })
          .mockResolvedValueOnce({
            success: true,
            transactionId: '0.0.1000@1234567890.333',
          }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999', continueOnError: true },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Failure);
    const output = JSON.parse(result.outputJson as string);
    expect(output.successCount).toBe(2);
    expect(output.failedCount).toBe(1);
    expect(output.results).toHaveLength(3);
  });

  test('skips self-transfers', async () => {
    const filePath = writeTestFile(
      'self-transfer.csv',
      'to,amount,memo\n0.0.1000,1000,Self transfer\n',
    );

    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.skippedCount).toBe(1);
    expect(output.results[0].status).toBe('skipped');
  });

  test('fetches token decimals for amount processing', async () => {
    const filePath = writeTestFile(
      'transfers.csv',
      'to,amount,memo\n0.0.12345,100.5,Test\n',
    );

    const api = makeApiMock({
      mirror: {
        getTokenInfo: jest.fn().mockResolvedValue({ decimals: '2' }),
      },
    });

    const args = makeCommandArgs({
      api,
      args: { file: filePath, token: '0.0.99999' },
    });

    const result = await batchTokenTransferHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(api.mirror.getTokenInfo).toHaveBeenCalledWith('0.0.99999');
  });
});
