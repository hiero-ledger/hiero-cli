/**
 * Unit tests for schedule:status handler
 */
import type { CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';

import { getScheduleStatus } from '../../commands/status/handler';
import type { StatusOutput } from '../../commands/status/output';

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

function makeArgs(
  apiOverrides: Record<string, unknown> = {},
  scheduleId = '0.0.9000',
): CommandHandlerArgs {
  return {
    args: { 'schedule-id': scheduleId },
    api: {
      network: makeNetworkMock(),
      ...apiOverrides,
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

function makeMirrorResponse(overrides = {}) {
  return {
    schedule_id: '0.0.9000',
    executed_timestamp: null,
    deleted: false,
    memo: '',
    consensus_timestamp: '1700000000.000000000',
    expiration_time: '1700003600.000000000',
    ...overrides,
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

describe('schedule:status handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns PENDING state when not executed or deleted', async () => {
    mockFetchOk(makeMirrorResponse());
    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe('PENDING');
    expect(output.executed).toBe(false);
    expect(output.deleted).toBe(false);
  });

  test('returns EXECUTED state when executed_timestamp is set', async () => {
    mockFetchOk(makeMirrorResponse({ executed_timestamp: '1700001000.000000000' }));
    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe('EXECUTED');
    expect(output.executed).toBe(true);
  });

  test('returns DELETED state when deleted=true', async () => {
    mockFetchOk(makeMirrorResponse({ deleted: true }));
    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Success);
    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe('DELETED');
    expect(output.deleted).toBe(true);
  });

  test('returns Failure with helpful message for 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn() });

    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('not found');
  });

  test('returns Failure for non-404 HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: jest.fn() });

    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('503');
  });

  test('returns Failure when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await getScheduleStatus(makeArgs());

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('ECONNREFUSED');
  });

  test('output contains correct network and scheduleId', async () => {
    mockFetchOk(makeMirrorResponse());
    const result = await getScheduleStatus(makeArgs());

    const output: StatusOutput = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.scheduleId).toBe('0.0.9000');
  });

  test('throws ZodError when schedule-id is missing', async () => {
    const args = { ...makeArgs(), args: {} };
    await expect(getScheduleStatus(args)).rejects.toThrow();
  });
});
