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

function computeHash(fields: Record<string, string>): string {
  return (
    '0x' +
    require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(fields))
      .digest('hex')
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('auctionlog verify', () => {
  it('should verify a valid commitment (local)', async () => {
    const logger = makeLogger();

    const fields = {
      auctionId: 'AUCTION-V-001',
      stage: 'created',
      metadata: 'test-meta',
      timestamp: '2026-02-21T00:00:00.000Z',
      nonce: '0xdeadbeef',
    };

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-001': { topicId: '0.0.5555' },
      'auctionlog-data:AUCTION-V-001:created': {
        ...fields,
        commitmentHash: computeHash(fields),
        topicId: '0.0.5555',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      mirror: { getTopicMessages: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-001',
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.allLocalValid).toBe(true);
    expect(output.localVerifiedCount).toBe(1);
    expect(output.entries[0].localVerified).toBe(true);
    expect(output.onChainEnabled).toBe(false);
    expect(output.allOnChainValid).toBeNull();
  });

  it('should detect tampered commitment', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-002': { topicId: '0.0.5555' },
      'auctionlog-data:AUCTION-V-002:created': {
        auctionId: 'AUCTION-V-002',
        stage: 'created',
        metadata: 'test-meta',
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
      mirror: { getTopicMessages: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-002',
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.allLocalValid).toBe(false);
    expect(output.entries[0].localVerified).toBe(false);
    expect(output.entries[0].reason).toContain('Local hash mismatch');
  });

  it('should fail if no audit log found', async () => {
    const logger = makeLogger();

    const stateStore = makeStateStore({});

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      mirror: { getTopicMessages: jest.fn() },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'NONEXISTENT',
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('No audit log found');
  });

  it('should perform on-chain verification when --on-chain is set', async () => {
    const logger = makeLogger();

    const fields = {
      auctionId: 'AUCTION-V-OC-001',
      stage: 'created',
      metadata: '',
      timestamp: '2026-02-21T00:00:00.000Z',
      nonce: '0xaabbccdd',
    };
    const hash = computeHash(fields);

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-OC-001': { topicId: '0.0.7777' },
      'auctionlog-data:AUCTION-V-OC-001:created': {
        ...fields,
        commitmentHash: hash,
        topicId: '0.0.7777',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    // Mock mirror node response with matching on-chain message
    const onChainMessage = JSON.stringify({
      version: 1,
      auctionId: 'AUCTION-V-OC-001',
      stage: 'created',
      commitmentHash: hash,
      timestamp: '2026-02-21T00:00:00.000Z',
    });
    const base64Message = Buffer.from(onChainMessage).toString('base64');

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      mirror: {
        getTopicMessages: jest.fn().mockResolvedValue({
          messages: [
            {
              consensus_timestamp: '2026-02-21T00:00:00.000Z',
              topic_id: '0.0.7777',
              message: base64Message,
              running_hash: '',
              sequence_number: 1,
            },
          ],
        }),
      },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-OC-001',
      onChain: true,
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.onChainEnabled).toBe(true);
    expect(output.allLocalValid).toBe(true);
    expect(output.allOnChainValid).toBe(true);
    expect(output.entries[0].onChainVerified).toBe(true);
    expect(api.mirror.getTopicMessages).toHaveBeenCalledWith({
      topicId: '0.0.7777',
    });
  });

  it('should detect on-chain hash mismatch', async () => {
    const logger = makeLogger();

    const fields = {
      auctionId: 'AUCTION-V-OCM-001',
      stage: 'created',
      metadata: '',
      timestamp: '2026-02-21T00:00:00.000Z',
      nonce: '0xaabbccdd',
    };
    const localHash = computeHash(fields);

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-OCM-001': { topicId: '0.0.7777' },
      'auctionlog-data:AUCTION-V-OCM-001:created': {
        ...fields,
        commitmentHash: localHash,
        topicId: '0.0.7777',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    // On-chain has a different hash
    const onChainMessage = JSON.stringify({
      version: 1,
      auctionId: 'AUCTION-V-OCM-001',
      stage: 'created',
      commitmentHash: '0xdifferenthashfromon-chain',
      timestamp: '2026-02-21T00:00:00.000Z',
    });
    const base64Message = Buffer.from(onChainMessage).toString('base64');

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      mirror: {
        getTopicMessages: jest.fn().mockResolvedValue({
          messages: [
            {
              consensus_timestamp: '2026-02-21T00:00:00.000Z',
              topic_id: '0.0.7777',
              message: base64Message,
              running_hash: '',
              sequence_number: 1,
            },
          ],
        }),
      },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-OCM-001',
      onChain: true,
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.allOnChainValid).toBe(false);
    expect(output.entries[0].onChainVerified).toBe(false);
    expect(output.entries[0].reason).toContain('On-chain hash mismatch');
  });

  it('should gracefully handle mirror node failure', async () => {
    const logger = makeLogger();

    const fields = {
      auctionId: 'AUCTION-V-MF-001',
      stage: 'created',
      metadata: '',
      timestamp: '2026-02-21T00:00:00.000Z',
      nonce: '0xaabbccdd',
    };
    const hash = computeHash(fields);

    const stateStore = makeStateStore({
      'auctionlog-data:AUCTION-V-MF-001': { topicId: '0.0.7777' },
      'auctionlog-data:AUCTION-V-MF-001:created': {
        ...fields,
        commitmentHash: hash,
        topicId: '0.0.7777',
        sequenceNumber: 1,
        network: 'testnet',
      },
    });

    const api = {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      mirror: {
        getTopicMessages: jest.fn().mockRejectedValue(
          new Error('Mirror node unavailable'),
        ),
      },
    };

    const args = makeArgs(api as any, logger, {
      auctionId: 'AUCTION-V-MF-001',
      onChain: true,
    });
    (args as any).state = stateStore;

    const result = await verifyCommitments(args);

    // Should still succeed with local verification
    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.allLocalValid).toBe(true);
    // On-chain is false (no messages fetched) since mirror failed,
    // but local verification still passes
    expect(output.entries[0].localVerified).toBe(true);
    // Mirror failure means on-chain messages map was empty,
    // so no matching message was found → false
    expect(output.entries[0].onChainVerified).toBe(false);
    // Reason should note the missing on-chain message
    expect(output.entries[0].reason).toContain('no matching message found');
  });
});
