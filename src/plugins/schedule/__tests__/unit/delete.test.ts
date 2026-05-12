import type { CoreApi, KeyResolverService, TransactionResult } from '@/core';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeArgs,
  makeConfigMock,
  makeLogger,
  makeNetworkMock,
  makeScheduleTransactionServiceMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  scheduleDelete,
  ScheduleDeleteOutputSchema,
} from '@/plugins/schedule/commands/delete';
import { ScheduleHelper } from '@/plugins/schedule/schedule-helper';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import {
  ADMIN_KEY_REF,
  ADMIN_PUBLIC_KEY,
  DELETE_SUCCESS_TX_ID,
  ON_CHAIN_SCHEDULE_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
} from './helpers/fixtures';

jest.mock('../../schedule-helper', () => ({
  ScheduleHelper: jest.fn(),
}));
jest.mock('../../zustand-state-helper', () => ({
  ZustandScheduleStateHelper: jest.fn(),
}));

const MockedScheduleHelper = ScheduleHelper as unknown as jest.Mock;
const MockedZustand = ZustandScheduleStateHelper as unknown as jest.Mock;

function resolvedSchedule(overrides: Record<string, unknown> = {}) {
  return {
    name: SCHEDULE_NAME,
    scheduleId: ON_CHAIN_SCHEDULE_ID,
    scheduled: true,
    executed: false,
    adminKeyRefId: ADMIN_KEY_REF,
    ...overrides,
  };
}

describe('schedule plugin — delete command', () => {
  let deleteScheduledMock: jest.Mock;
  let resolveScheduleMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    deleteScheduledMock = jest.fn();
    resolveScheduleMock = jest.fn();
    MockedZustand.mockImplementation(() => ({
      deleteScheduled: deleteScheduledMock,
    }));
    MockedScheduleHelper.mockImplementation(() => ({
      resolveScheduleIdByEntityReference: resolveScheduleMock,
    }));
  });

  test('removes local state only when schedule was never submitted on-chain', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({
        scheduled: false,
        executed: false,
        scheduleId: undefined,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });
    const result = await scheduleDelete(args);

    expect(resolveScheduleMock).toHaveBeenCalledTimes(1);
    expect(deleteScheduledMock).toHaveBeenCalledWith(SCHEDULE_COMPOSED_KEY);
    const output = assertOutput(result.result, ScheduleDeleteOutputSchema);
    expect(output.name).toBe(SCHEDULE_NAME);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.transactionId).toBeUndefined();
  });

  test('removes local state only when schedule is already executed on-chain', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({
        scheduled: true,
        executed: true,
        scheduleId: ON_CHAIN_SCHEDULE_ID,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });
    const result = await scheduleDelete(args);

    expect(deleteScheduledMock).toHaveBeenCalledWith(SCHEDULE_COMPOSED_KEY);
    const output = assertOutput(result.result, ScheduleDeleteOutputSchema);
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
    expect(output.transactionId).toBeUndefined();
  });

  test('throws ValidationError when skipping on-chain delete but schedule has no local name', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue({
      scheduled: true,
      executed: true,
      scheduleId: ON_CHAIN_SCHEDULE_ID,
      name: undefined,
    });

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, { schedule: ON_CHAIN_SCHEDULE_ID });

    await expect(scheduleDelete(args)).rejects.toThrow(
      'Could not resolve schedule ID',
    );
    expect(deleteScheduledMock).not.toHaveBeenCalled();
  });

  test('submits ScheduleDeleteTransaction when schedule is on-chain and not executed', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    const buildScheduleDeleteTransaction = jest.fn().mockReturnValue({
      transaction: createMockTransaction(),
    });
    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleDeleteTransaction =
      buildScheduleDeleteTransaction;

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());
    const executeResult: TransactionResult = {
      transactionId: DELETE_SUCCESS_TX_ID,
      success: true,
      receipt: {
        status: {
          status: 'success',
          transactionId: DELETE_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    };
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue(executeResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const keyResolver = {
      resolveSigningKey: jest.fn().mockResolvedValue({
        keyRefId: ADMIN_KEY_REF,
        publicKey: ADMIN_PUBLIC_KEY,
      }),
    } as unknown as KeyResolverService;

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      keyResolver,
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    const result = await scheduleDelete(args);

    expect(resolveScheduleMock).toHaveBeenCalledTimes(2);
    expect(buildScheduleDeleteTransaction).toHaveBeenCalledWith({
      scheduleId: ON_CHAIN_SCHEDULE_ID,
    });
    expect(txSign.sign).toHaveBeenCalled();
    expect(txExecute.execute).toHaveBeenCalled();
    expect(deleteScheduledMock).toHaveBeenCalledWith(SCHEDULE_COMPOSED_KEY);

    const output = assertOutput(result.result, ScheduleDeleteOutputSchema);
    expect(output.transactionId).toBe(DELETE_SUCCESS_TX_ID);
    expect(output.name).toBe(SCHEDULE_NAME);
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
  });

  test('throws TransactionError when on-chain delete execution fails', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleDeleteTransaction = jest
      .fn()
      .mockReturnValue({ transaction: createMockTransaction() });

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue({
      transactionId: DELETE_SUCCESS_TX_ID,
      success: false,
      receipt: {
        status: {
          status: 'failed',
          transactionId: DELETE_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    } satisfies TransactionResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      keyResolver: {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: ADMIN_KEY_REF,
          publicKey: ADMIN_PUBLIC_KEY,
        }),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    await expect(scheduleDelete(args)).rejects.toThrow(
      'Schedule delete failed',
    );
    expect(deleteScheduledMock).not.toHaveBeenCalled();
  });

  test('throws ValidationError when admin key cannot be resolved for on-chain delete', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({
        adminKeyRefId: undefined,
      }),
    );

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleDeleteTransaction = jest
      .fn()
      .mockReturnValue({ transaction: createMockTransaction() });

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      keyResolver: {
        resolveSigningKey: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    await expect(scheduleDelete(args)).rejects.toThrow(
      'Missing admin key to sign the transaction with',
    );
  });
});
