import { Status } from '@/core/shared/constants';
import { publishCommitment } from '../../commands/publish/handler';
import type { CommandHandlerArgs } from '@/core';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

function makeArgs(
  args: Record<string, unknown>,
  overrides: Partial<CommandHandlerArgs> = {},
): CommandHandlerArgs {
  const stateStore = new Map<string, unknown>();

  return {
    args,
    api: {
      network: { getCurrentNetwork: jest.fn().mockReturnValue('testnet') },
      topic: {
        createTopic: jest.fn().mockReturnValue({
          transaction: { /* mock transaction */ },
        }),
        submitMessage: jest.fn().mockReturnValue({
          transaction: { /* mock transaction */ },
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          topicId: '0.0.9999999',
          topicSequenceNumber: 1,
        }),
      },
      alias: { resolve: jest.fn() },
      ...overrides.api,
    } as any,
    state: {
      get: jest.fn((ns: string, key: string) => stateStore.get(`${ns}:${key}`)),
      set: jest.fn((ns: string, key: string, val: unknown) =>
        stateStore.set(`${ns}:${key}`, val),
      ),
      getKeys: jest.fn().mockReturnValue([]),
      ...overrides.state,
    } as any,
    config: {
      getConfig: jest.fn(),
      getValue: jest.fn(),
      getOption: jest.fn(),
      ...overrides.config,
    } as any,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      ...overrides.logger,
    } as any,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('auctionlog publish', () => {
  it('should publish a commitment and return success', async () => {
    const handlerArgs = makeArgs({
      auctionId: 'AUCTION-TEST-001',
      stage: 'created',
      cantonRef: 'CANTON-TX-001',
      adiTx: '0xabc123',
    });

    const result = await publishCommitment(handlerArgs);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = JSON.parse(result.outputJson!);
    expect(output.auctionId).toBe('AUCTION-TEST-001');
    expect(output.stage).toBe('created');
    expect(output.commitmentHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(output.topicId).toBe('0.0.9999999');
    expect(output.sequenceNumber).toBe(1);
    expect(output.network).toBe('testnet');
  });

  it('should create a new topic if none exists', async () => {
    const handlerArgs = makeArgs({
      auctionId: 'AUCTION-NEW-001',
      stage: 'created',
    });

    const result = await publishCommitment(handlerArgs);

    expect(result.status).toBe(Status.Success);
    expect(handlerArgs.api.topic.createTopic).toHaveBeenCalledWith({
      memo: 'BlindBid audit: AUCTION-NEW-001',
    });
  });

  it('should reuse existing topic from state', async () => {
    const handlerArgs = makeArgs({
      auctionId: 'AUCTION-REUSE-001',
      stage: 'bidding-closed',
    });

    // Pre-populate state with existing topic
    (handlerArgs.state.get as jest.Mock).mockImplementation(
      (ns: string, key: string) => {
        if (key === 'AUCTION-REUSE-001') {
          return { topicId: '0.0.1111111', lastStage: 'created' };
        }
        return undefined;
      },
    );

    const result = await publishCommitment(handlerArgs);

    expect(result.status).toBe(Status.Success);
    expect(handlerArgs.api.topic.createTopic).not.toHaveBeenCalled();
  });

  it('should reject invalid stage', async () => {
    const handlerArgs = makeArgs({
      auctionId: 'AUCTION-BAD-001',
      stage: 'invalid-stage',
    });

    await expect(publishCommitment(handlerArgs)).rejects.toThrow();
  });

  it('should reject missing auctionId', async () => {
    const handlerArgs = makeArgs({
      stage: 'created',
    });

    await expect(publishCommitment(handlerArgs)).rejects.toThrow();
  });

  it('should return failure when topic creation fails', async () => {
    const handlerArgs = makeArgs({
      auctionId: 'AUCTION-FAIL-001',
      stage: 'created',
    });

    (handlerArgs.api.txExecution.signAndExecute as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

    const result = await publishCommitment(handlerArgs);
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to create HCS topic');
  });
});
