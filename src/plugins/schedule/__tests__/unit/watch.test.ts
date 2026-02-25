/**
 * Unit tests for schedule:watch handler
 *
 * Uses Jest fake timers to avoid real delays while still exercising the
 * polling loop, timeout logic, and terminal-state detection.
 */
import type { CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';

import { watchSchedule } from '../../commands/watch/handler';
import type { WatchOutput } from '../../commands/watch/output';

// ── Global fetch mock ─────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeNetworkMock = (network = 'testnet') => ({
  getCurrentNetwork: jest.fn().mockReturnValue(network),
  getNetworkConfig: jest.fn().mockReturnValue({
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
  }),
});

function makeArgs(argOverrides: Record<string, unknown> = {}): CommandHandlerArgs {
  return {
    args: {
      'schedule-id': '0.0.9000',
      'poll-interval': 1,   // 1 s → fast in tests
      timeout: 10,           // 10 s
      ...argOverrides,
    },
    api: {
      network: makeNetworkMock(),
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

function mockFetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schedule:watch handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns EXECUTED when mirror node returns executed_timestamp', async () => {
    // First poll: PENDING, second poll: EXECUTED
    mockFetchOk({ executed_timestamp: null, deleted: false });
    mockFetchOk({ executed_timestamp: '1700001000.000000000', deleted: false });

    const watchPromise = watchSchedule(makeArgs());

    // Advance timers to trigger the sleep() in the loop
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Success);
    const output: WatchOutput = JSON.parse(result.outputJson!);
    expect(output.finalState).toBe('EXECUTED');
    expect(output.scheduleId).toBe('0.0.9000');
  });

  test('returns DELETED when mirror node returns deleted=true', async () => {
    mockFetchOk({ executed_timestamp: null, deleted: false });
    mockFetchOk({ executed_timestamp: null, deleted: true });

    const watchPromise = watchSchedule(makeArgs());
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Success);
    const output: WatchOutput = JSON.parse(result.outputJson!);
    expect(output.finalState).toBe('DELETED');
  });

  test('returns TIMEOUT when elapsed time exceeds timeout option', async () => {
    // Always return PENDING
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ executed_timestamp: null, deleted: false }),
    });

    // timeout = 0 means the very first elapsed check triggers immediately
    const watchPromise = watchSchedule(makeArgs({ timeout: 0 }));
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Success);
    const output: WatchOutput = JSON.parse(result.outputJson!);
    expect(output.finalState).toBe('TIMEOUT');
  });

  test('retries silently on 404 (schedule not yet visible)', async () => {
    // 404 first → then EXECUTED
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ executed_timestamp: '1700001000.0', deleted: false }),
      });

    const watchPromise = watchSchedule(makeArgs());
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Success);
    const output: WatchOutput = JSON.parse(result.outputJson!);
    expect(output.finalState).toBe('EXECUTED');
  });

  test('returns Failure on non-404 HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: jest.fn() });

    const watchPromise = watchSchedule(makeArgs());
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('503');
  });

  test('returns Failure when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const watchPromise = watchSchedule(makeArgs());
    await jest.runAllTimersAsync();

    const result = await watchPromise;

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('ECONNREFUSED');
  });

  test('throws ZodError when schedule-id is missing', async () => {
    const args = { ...makeArgs(), args: {} };
    await expect(watchSchedule(args)).rejects.toThrow();
  });
});
