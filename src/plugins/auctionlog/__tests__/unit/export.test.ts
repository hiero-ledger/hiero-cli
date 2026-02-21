import { Status } from '@/core/shared/constants';
import { exportAuditLog } from '../../commands/export/handler';

import {
  makeArgs,
  makeLogger,
} from '@/__tests__/mocks/mocks';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeStateStore(entries: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(entries));
  return {
    get: jest.fn((ns: string, key: string) => store.get(`${ns}:${key}`)),
    set: jest.fn((ns: string, key: string, val: unknown) =>
      store.set(`${ns}:${key}`, val),
    ),
    getKeys: jest.fn(() => [...store.keys()]),
    list: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(),
    getNamespaces: jest.fn(),
    subscribe: jest.fn(),
    getActions: jest.fn(),
    getState: jest.fn(),
    getStorageDirectory: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
  };
}

function makeEntry(stage: string, seq: number) {
  return {
    auctionId: 'AUCTION-E-001',
    stage,
    cantonRef: `CANTON-${stage}`,
    adiTx: `0x${stage}`,
    timestamp: `2026-02-21T0${seq}:00:00.000Z`,
    nonce: `0x${stage}nonce`,
    commitmentHash: `0x${stage}hash`,
    topicId: '0.0.7777',
    sequenceNumber: seq,
    network: 'testnet',
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('auctionlog export', () => {
  it('should export as JSON by default', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-E-001': { topicId: '0.0.7777' },
      'auctionlog-data:AUCTION-E-001:created': makeEntry('created', 1),
      'auctionlog-data:AUCTION-E-001:awarded': makeEntry('awarded', 2),
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-E-001',
    });
    (args as any).state = stateStore;

    const result = await exportAuditLog(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.exportFormat).toBe('json');
    expect(output.entryCount).toBe(2);
    expect(output.entries[0].stage).toBe('created');
    expect(output.entries[1].stage).toBe('awarded');
  });

  it('should export as CSV when requested', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-E-002': { topicId: '0.0.7777' },
      'auctionlog-data:AUCTION-E-002:created': makeEntry('created', 1),
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-E-002',
      type: 'csv',
    });
    (args as any).state = stateStore;

    const result = await exportAuditLog(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.exportFormat).toBe('csv');
    expect(output.entryCount).toBe(1);
  });

  it('should fail if no entries found', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-E-003': { topicId: '0.0.7777' },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-E-003',
    });
    (args as any).state = stateStore;

    const result = await exportAuditLog(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('No published stages found');
  });
});
