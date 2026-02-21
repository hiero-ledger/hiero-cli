import { Status } from '@/core/shared/constants';
import { listAuctions } from '../../commands/list/handler';

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
    getKeys: jest.fn((ns: string) => {
      const prefix = `${ns}:`;
      return [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    }),
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

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('auctionlog list', () => {
  it('should list tracked auctions', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-L-001': {
        topicId: '0.0.8888',
        lastStage: 'awarded',
        lastUpdated: '2026-02-21T00:00:00.000Z',
      },
      'auctionlog-data:AUCTION-L-001:created': {
        auctionId: 'AUCTION-L-001',
        stage: 'created',
        topicId: '0.0.8888',
      },
      'auctionlog-data:AUCTION-L-001:awarded': {
        auctionId: 'AUCTION-L-001',
        stage: 'awarded',
        topicId: '0.0.8888',
      },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {});
    (args as any).state = stateStore;

    const result = await listAuctions(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.totalAuctions).toBe(1);
    expect(output.auctions[0].auctionId).toBe('AUCTION-L-001');
    expect(output.auctions[0].topicId).toBe('0.0.8888');
    expect(output.auctions[0].stageCount).toBe(2);
  });

  it('should return empty when no auctions exist', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({});

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {});
    (args as any).state = stateStore;

    const result = await listAuctions(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.totalAuctions).toBe(0);
    expect(output.auctions).toEqual([]);
  });
});
