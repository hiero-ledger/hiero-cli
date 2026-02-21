import { Status } from '@/core/shared/constants';
import { publishCommitment } from '../../commands/publish/handler';

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

describe('auctionlog publish', () => {
  it('should publish a commitment and return success', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({
          transaction: {},
        }),
        submitMessage: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          topicId: '0.0.9999999',
          topicSequenceNumber: 1,
        }),
      },
    };

    const stateStore = makeStateStore({});
    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-TEST-001',
      stage: 'created',
      metadata: 'canton-tx-abc123',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.auctionId).toBe('AUCTION-TEST-001');
    expect(output.stage).toBe('created');
    expect(output.commitmentHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(output.topicId).toBe('0.0.9999999');
    expect(output.sequenceNumber).toBe(1);
    expect(output.network).toBe('testnet');
    // Nonce should be a proper crypto nonce (32 hex chars + 0x prefix)
    expect(output.nonce).toMatch(/^0x[a-f0-9]{32}$/);
  });

  it('should create a new topic if none exists', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({
          transaction: {},
        }),
        submitMessage: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          topicId: '0.0.9999999',
          topicSequenceNumber: 1,
        }),
      },
    };

    const stateStore = makeStateStore({});
    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-NEW-001',
      stage: 'created',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);

    expect(result.status).toBe(Status.Success);
    expect(api.topic.createTopic).toHaveBeenCalledWith({
      memo: 'auctionlog: AUCTION-NEW-001',
    });
  });

  it('should reuse existing topic from state', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({
          transaction: {},
        }),
        submitMessage: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          topicId: '0.0.1111111',
          topicSequenceNumber: 2,
        }),
      },
    };

    // Pre-populate state with existing auction (created stage done)
    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-REUSE-001': {
        topicId: '0.0.1111111',
        lastStage: 'created',
        lastUpdated: '2026-02-21T00:00:00.000Z',
      },
      'auctionlog-data:AUCTION-REUSE-001:created': {
        auctionId: 'AUCTION-REUSE-001',
        stage: 'created',
        topicId: '0.0.1111111',
      },
    });

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-REUSE-001',
      stage: 'bidding-open',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);

    expect(result.status).toBe(Status.Success);
    // Should NOT create a new topic
    expect(api.topic.createTopic).not.toHaveBeenCalled();
  });

  it('should reject invalid stage', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
    };

    const stateStore = makeStateStore({});
    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-BAD-001',
      stage: 'invalid-stage',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    await expect(publishCommitment(args)).rejects.toThrow();
  });

  it('should reject missing auctionId', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
    };

    const stateStore = makeStateStore({});
    const args = makeArgs(api as any, logger, {
      stage: 'created',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    await expect(publishCommitment(args)).rejects.toThrow();
  });

  it('should return failure when topic creation fails', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({
          transaction: {},
        }),
        submitMessage: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: false,
        }),
      },
    };

    const stateStore = makeStateStore({});
    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-FAIL-001',
      stage: 'created',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to create HCS topic');
  });

  it('should reject duplicate stage publication', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
    };

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-DUP-001': {
        topicId: '0.0.5555',
        lastStage: 'created',
        lastUpdated: '2026-02-21T00:00:00.000Z',
      },
      'auctionlog-data:AUCTION-DUP-001:created': {
        auctionId: 'AUCTION-DUP-001',
        stage: 'created',
        topicId: '0.0.5555',
      },
    });

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-DUP-001',
      stage: 'created',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('already been published');
  });

  it('should enforce stage ordering — reject out-of-order stages', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
    };

    // Only 'created' exists — skip directly to 'awarded'
    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-ORDER-001': {
        topicId: '0.0.5555',
        lastStage: 'created',
        lastUpdated: '2026-02-21T00:00:00.000Z',
      },
      'auctionlog-data:AUCTION-ORDER-001:created': {
        auctionId: 'AUCTION-ORDER-001',
        stage: 'created',
        topicId: '0.0.5555',
      },
    });

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-ORDER-001',
      stage: 'awarded',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('bidding-closed');
    expect(result.errorMessage).toContain('has not been published yet');
  });

  it('should allow disputed at any time after auction exists', async () => {
    const logger = makeLogger();

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({ transaction: {} }),
        submitMessage: jest.fn().mockReturnValue({ transaction: {} }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          topicId: '0.0.5555',
          topicSequenceNumber: 2,
        }),
      },
    };

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-DISPUTE-001': {
        topicId: '0.0.5555',
        lastStage: 'created',
        lastUpdated: '2026-02-21T00:00:00.000Z',
      },
      'auctionlog-data:AUCTION-DISPUTE-001:created': {
        auctionId: 'AUCTION-DISPUTE-001',
        stage: 'created',
        topicId: '0.0.5555',
      },
    });

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-DISPUTE-001',
      stage: 'disputed',
    });
    (args as any).state = stateStore;
    (args as any).api = api;

    const result = await publishCommitment(args);
    expect(result.status).toBe(Status.Success);
  });

  it('should produce deterministic hashes for same inputs', async () => {
    const { buildCommitmentHash } = require('../../commands/publish/handler');
    const hash1 = buildCommitmentHash('A-001', 'created', 'meta', '2026-01-01T00:00:00Z', '0xabc');
    const hash2 = buildCommitmentHash('A-001', 'created', 'meta', '2026-01-01T00:00:00Z', '0xabc');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should produce different hashes for different inputs', async () => {
    const { buildCommitmentHash } = require('../../commands/publish/handler');
    const hash1 = buildCommitmentHash('A-001', 'created', 'meta', '2026-01-01T00:00:00Z', '0xabc');
    const hash2 = buildCommitmentHash('A-001', 'created', 'meta', '2026-01-01T00:00:00Z', '0xdef');
    expect(hash1).not.toBe(hash2);
  });
});
