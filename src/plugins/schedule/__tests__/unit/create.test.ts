/**
 * Unit tests for schedule:create handler
 *
 * Follows the same pattern as src/plugins/topic/__tests__/unit/create.test.ts:
 *   – mock CommandHandlerArgs via plain objects
 *   – mock @hashgraph/sdk constructors
 *   – assert status, outputJson fields, and error paths
 */
import type { CommandHandlerArgs } from '@/core';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';

import { Status } from '@/core/shared/constants';

import { createSchedule } from '../../commands/create/handler';
import type { CreateScheduleOutput } from '../../commands/create/output';

// ── SDK mocks ─────────────────────────────────────────────────────────────────
const mockInnerTx = {
  addHbarTransfer: jest.fn().mockReturnThis(),
};

const mockScheduleTx = {
  setScheduledTransaction: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  setWaitForExpiry: jest.fn().mockReturnThis(),
  setScheduleMemo: jest.fn().mockReturnThis(),
};

jest.mock('@hashgraph/sdk', () => ({
  Hbar: {
    fromTinybars: jest.fn().mockReturnValue({ _valueInTinybar: '10000000' }),
  },
  Timestamp: jest.fn().mockImplementation(() => ({})),
  TransferTransaction: jest.fn().mockImplementation(() => mockInnerTx),
  ScheduleCreateTransaction: jest.fn().mockImplementation(() => mockScheduleTx),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeNetworkMock = (network = 'testnet') => ({
  getCurrentNetwork: jest.fn().mockReturnValue(network),
  getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
    accountId: '0.0.1001',
    keyRefId: 'ref-operator',
  }),
  getNetworkConfig: jest.fn().mockReturnValue({
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
  }),
});

const makeSigningMock = (
  overrides: Partial<TransactionResult> = {},
): jest.Mocked<{ signAndExecute: jest.Mock }> => ({
  signAndExecute: jest.fn().mockResolvedValue({
    success: true,
    transactionId: '0.0.1001@1700000000.000000000',
    scheduleId: '0.0.9000',
    consensusTimestamp: '2024-01-01T00:00:00.000Z',
    receipt: { status: { status: 'success', transactionId: '0.0.1001@1700000000.000000000' } },
    ...overrides,
  } as TransactionResult),
});

function makeArgs(
  apiOverrides: Record<string, unknown> = {},
  argValues: Record<string, unknown> = {},
): CommandHandlerArgs {
  const logger = makeLogger();
  return {
    args: {
      to: '0.0.2002',
      amount: '10000000',
      'expiry-seconds': 600,
      ...argValues,
    },
    api: {
      network: makeNetworkMock(),
      txExecution: makeSigningMock(),
      ...apiOverrides,
    } as unknown as CommandHandlerArgs['api'],
    logger,
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schedule:create handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns Success with correct output on happy path', async () => {
    const args = makeArgs();

    const result = await createSchedule(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: CreateScheduleOutput = JSON.parse(result.outputJson!);
    expect(output.scheduleId).toBe('0.0.9000');
    expect(output.transactionId).toBe('0.0.1001@1700000000.000000000');
    expect(output.payer).toBe('0.0.1001');
    expect(output.expirySeconds).toBe(600);
    expect(output.network).toBe('testnet');
  });

  test('calls setScheduleMemo when memo option is provided', async () => {
    const args = makeArgs({}, { to: '0.0.2002', amount: '5000000', memo: 'season-1' });

    await createSchedule(args);

    expect(mockScheduleTx.setScheduleMemo).toHaveBeenCalledWith('season-1');
  });

  test('does not call setScheduleMemo when memo is absent', async () => {
    const args = makeArgs();

    await createSchedule(args);

    expect(mockScheduleTx.setScheduleMemo).not.toHaveBeenCalled();
  });

  test('returns Failure when signAndExecute reports success=false', async () => {
    const signing = makeSigningMock({ success: false, scheduleId: undefined });
    const args = makeArgs({ txExecution: signing });

    const result = await createSchedule(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('non-success status');
  });

  test('returns Failure when receipt contains no scheduleId', async () => {
    const signing = makeSigningMock({ success: true, scheduleId: undefined });
    const args = makeArgs({ txExecution: signing });

    const result = await createSchedule(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('schedule ID was not returned');
  });

  test('returns Failure when signAndExecute throws', async () => {
    const signing = {
      signAndExecute: jest.fn().mockRejectedValue(new Error('network error')),
    };
    const args = makeArgs({ txExecution: signing });

    const result = await createSchedule(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('network error');
  });

  test('throws ZodError (propagates) when required args are missing', async () => {
    const args = makeArgs({}, { to: undefined, amount: undefined });

    await expect(createSchedule(args)).rejects.toThrow();
  });

  test('throws ZodError when amount is not a numeric string', async () => {
    const args = makeArgs({}, { to: '0.0.2002', amount: 'not-a-number' });

    await expect(createSchedule(args)).rejects.toThrow();
  });
});
