import { Status } from '@/core/shared/constants';
import { verifyCommitments } from '../../commands/verify/handler';

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

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('auctionlog verify', () => {
  it('should verify a valid commitment', async () => {
    const logger = makeLogger();

    // Pre-populate state with a known entry
    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-001': { topicId: '0.0.5555' },
      'auctionlog-data:AUCTION-V-001:created': {
        auctionId: 'AUCTION-V-001',
        stage: 'created',
        cantonRef: 'CANTON-001',
        adiTx: '0xabc',
        timestamp: '2026-02-21T00:00:00.000Z',
        nonce: '0xdeadbeef',
        commitmentHash:
          '0x' +
          require('crypto')
            .createHash('sha256')
            .update(
              JSON.stringify({
                auctionId: 'AUCTION-V-001',
                stage: 'created',
                cantonRef: 'CANTON-001',
                adiTx: '0xabc',
                timestamp: '2026-02-21T00:00:00.000Z',
                nonce: '0xdeadbeef',
              }),
            )
            .digest('hex'),
        topicId: '0.0.5555',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-001',
    });
    // Override state with our custom store
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.allValid).toBe(true);
    expect(output.verifiedCount).toBe(1);
    expect(output.entries[0].verified).toBe(true);
  });

  it('should detect tampered commitment', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-002': { topicId: '0.0.5555' },
      'auctionlog-data:AUCTION-V-002:created': {
        auctionId: 'AUCTION-V-002',
        stage: 'created',
        cantonRef: 'CANTON-001',
        adiTx: '0xabc',
        timestamp: '2026-02-21T00:00:00.000Z',
        nonce: '0xdeadbeef',
        commitmentHash: '0xTAMPERED_HASH_THAT_SHOULD_NOT_MATCH',
        topicId: '0.0.5555',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-002',
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.allValid).toBe(false);
    expect(output.entries[0].verified).toBe(false);
    expect(output.entries[0].reason).toContain('Hash mismatch');
  });

  it('should fail if no audit log found', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({});

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: { createTopic: jest.fn(), submitMessage: jest.fn() },
      txExecution: { signAndExecute: jest.fn() },
      alias: { resolve: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'NONEXISTENT',
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('No audit log found');
  });
});
