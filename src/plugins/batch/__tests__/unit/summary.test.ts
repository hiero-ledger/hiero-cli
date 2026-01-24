/**
 * Batch Summary Handler Unit Tests
 */
import type { BatchOperation } from '@/plugins/batch/schema';

import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { batchSummaryHandler } from '@/plugins/batch/commands/summary/handler';

import { makeApiMock, makeCommandArgs, makeStateMock } from './helpers/mocks';

describe('batch summary', () => {
  test('returns empty list when no operations exist', async () => {
    const api = makeApiMock();
    const args = makeCommandArgs({
      api,
      args: {},
    });

    const result = await batchSummaryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.operations).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('returns operations sorted by date descending', async () => {
    const state = makeStateMock();
    const mockOperations: BatchOperation[] = [
      {
        id: 'id-1',
        type: 'hbar-transfer',
        network: SupportedNetwork.TESTNET,
        status: 'completed',
        totalOperations: 5,
        successCount: 5,
        failedCount: 0,
        skippedCount: 0,
        results: [],
        createdAt: '2024-01-01T10:00:00.000Z',
      },
      {
        id: 'id-2',
        type: 'token-transfer',
        network: SupportedNetwork.TESTNET,
        status: 'partial',
        totalOperations: 10,
        successCount: 8,
        failedCount: 2,
        skippedCount: 0,
        results: [],
        createdAt: '2024-01-02T10:00:00.000Z',
      },
    ];

    state.list.mockReturnValue(mockOperations);

    const api = makeApiMock({ state });
    const args = makeCommandArgs({
      api,
      args: {},
    });

    const result = await batchSummaryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.operations).toHaveLength(2);
    // Should be sorted by date descending (newest first)
    expect(output.operations[0].id).toBe('id-2');
    expect(output.operations[1].id).toBe('id-1');
  });

  test('respects limit parameter', async () => {
    const state = makeStateMock();
    const mockOperations: BatchOperation[] = [];

    for (let i = 0; i < 15; i++) {
      mockOperations.push({
        id: `id-${i}`,
        type: 'hbar-transfer',
        network: SupportedNetwork.TESTNET,
        status: 'completed',
        totalOperations: 1,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
        results: [],
        createdAt: new Date(2024, 0, i + 1).toISOString(),
      });
    }

    state.list.mockReturnValue(mockOperations);

    const api = makeApiMock({ state });
    const args = makeCommandArgs({
      api,
      args: { limit: 5 },
    });

    const result = await batchSummaryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    expect(output.operations).toHaveLength(5);
    expect(output.totalCount).toBe(15);
  });

  test('returns operation summary fields', async () => {
    const state = makeStateMock();
    const mockOperation: BatchOperation = {
      id: 'test-uuid',
      type: 'hbar-transfer',
      network: SupportedNetwork.MAINNET,
      status: 'failed',
      totalOperations: 100,
      successCount: 95,
      failedCount: 5,
      skippedCount: 0,
      results: [],
      createdAt: '2024-06-15T14:30:00.000Z',
    };

    state.list.mockReturnValue([mockOperation]);

    const api = makeApiMock({ state });
    const args = makeCommandArgs({
      api,
      args: {},
    });

    const result = await batchSummaryHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson as string);
    const op = output.operations[0];
    expect(op.id).toBe('test-uuid');
    expect(op.type).toBe('hbar-transfer');
    expect(op.status).toBe('failed');
    expect(op.totalOperations).toBe(100);
    expect(op.successCount).toBe(95);
    expect(op.failedCount).toBe(5);
    expect(op.createdAt).toBe('2024-06-15T14:30:00.000Z');
  });
});
