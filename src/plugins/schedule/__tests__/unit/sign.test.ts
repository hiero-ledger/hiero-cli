import type {
  CoreApi,
  HederaMirrornodeService,
  KeyResolverService,
  TransactionResult,
} from '@/core';

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
  scheduleSign,
  ScheduleSignOutputSchema,
} from '@/plugins/schedule/commands/sign';
import { ScheduleHelper } from '@/plugins/schedule/schedule-helper';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import {
  ADMIN_PUBLIC_KEY,
  MIRROR_CONSENSUS_TS,
  ON_CHAIN_SCHEDULE_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
  SIGN_SUCCESS_TX_ID,
  SIGNER_KEY_REF,
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
    ...overrides,
  };
}

/** Minimal mirror payload for post-sign sync (executed_timestamp optional). */
function mirrorSchedulePayload(executedTimestamp: string | null = null) {
  return {
    schedule_id: ON_CHAIN_SCHEDULE_ID,
    executed_timestamp: executedTimestamp,
  };
}

describe('schedule plugin — sign command', () => {
  let resolveScheduleMock: jest.Mock;
  let getScheduledStateMock: jest.Mock;
  let saveScheduledMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resolveScheduleMock = jest.fn();
    getScheduledStateMock = jest.fn().mockReturnValue(undefined);
    saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      resolveScheduleIdByEntityReference: resolveScheduleMock,
    }));
    MockedZustand.mockImplementation(() => ({
      getScheduled: getScheduledStateMock,
      saveScheduled: saveScheduledMock,
    }));
  });

  test('throws ValidationError when schedule is not on-chain yet', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({ scheduled: false, scheduledId: undefined }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      keyResolver: {
        resolveSigningKey: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    await expect(scheduleSign(args)).rejects.toThrow(
      'Schedule has not been yet submitted',
    );
  });

  test('throws ValidationError when schedule is already executed', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({ scheduled: true, executed: true }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      keyResolver: {
        resolveSigningKey: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    await expect(scheduleSign(args)).rejects.toThrow(
      'Schedule is already executed',
    );
  });

  test('throws ValidationError when schedule id cannot be resolved', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(
      resolvedSchedule({
        scheduled: true,
        executed: false,
        scheduleId: undefined,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      keyResolver: {
        resolveSigningKey: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    await expect(scheduleSign(args)).rejects.toThrow(
      "Couldn't resolve schedule ID for signing",
    );
  });

  test('builds ScheduleSignTransaction, signs, executes, and returns output', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    const buildScheduleSignTransaction = jest.fn().mockReturnValue({
      transaction: createMockTransaction(),
    });
    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleSignTransaction = buildScheduleSignTransaction;

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());

    const executeResult: TransactionResult = {
      transactionId: SIGN_SUCCESS_TX_ID,
      success: true,
      receipt: {
        status: {
          status: 'success',
          transactionId: SIGN_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    };
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue(executeResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const resolveSigningKey = jest.fn().mockResolvedValue({
      keyRefId: SIGNER_KEY_REF,
      publicKey: ADMIN_PUBLIC_KEY,
    });

    const getScheduledMirror = jest
      .fn()
      .mockResolvedValue(mirrorSchedulePayload(null));

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      mirror: {
        getScheduled: getScheduledMirror,
      } as unknown as HederaMirrornodeService,
      keyResolver: {
        resolveSigningKey,
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    const result = await scheduleSign(args);

    expect(buildScheduleSignTransaction).toHaveBeenCalledWith({
      scheduleId: ON_CHAIN_SCHEDULE_ID,
    });
    expect(resolveSigningKey).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local,
      false,
      ['schedule:signer'],
    );
    expect(txSign.sign).toHaveBeenCalled();
    expect(txExecute.execute).toHaveBeenCalled();
    expect(getScheduledMirror).toHaveBeenCalledWith(ON_CHAIN_SCHEDULE_ID);
    expect(saveScheduledMock).not.toHaveBeenCalled();

    const output = assertOutput(result.result, ScheduleSignOutputSchema);
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
    expect(output.transactionId).toBe(SIGN_SUCCESS_TX_ID);
    expect(output.name).toBe(SCHEDULE_NAME);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
  });

  test('updates local state when mirror reports execution after successful sign', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    getScheduledStateMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduledId: ON_CHAIN_SCHEDULE_ID,
      scheduled: true,
      executed: false,
    });

    const getScheduledMirror = jest
      .fn()
      .mockResolvedValue(mirrorSchedulePayload(MIRROR_CONSENSUS_TS));

    const buildScheduleSignTransaction = jest.fn().mockReturnValue({
      transaction: createMockTransaction(),
    });
    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleSignTransaction = buildScheduleSignTransaction;

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());

    const executeResult: TransactionResult = {
      transactionId: SIGN_SUCCESS_TX_ID,
      success: true,
      receipt: {
        status: {
          status: 'success',
          transactionId: SIGN_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    };
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue(executeResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      mirror: {
        getScheduled: getScheduledMirror,
      } as unknown as HederaMirrornodeService,
      keyResolver: {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: SIGNER_KEY_REF,
          publicKey: ADMIN_PUBLIC_KEY,
        }),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    await scheduleSign(args);

    expect(getScheduledMirror).toHaveBeenCalledWith(ON_CHAIN_SCHEDULE_ID);
    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        executed: true,
        scheduled: true,
        name: SCHEDULE_NAME,
      }),
    );
  });

  test('throws TransactionError when execution fails', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleSignTransaction = jest
      .fn()
      .mockReturnValue({ transaction: createMockTransaction() });

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue({
      transactionId: SIGN_SUCCESS_TX_ID,
      success: false,
      receipt: {
        status: {
          status: 'failed',
          transactionId: SIGN_SUCCESS_TX_ID,
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
          keyRefId: SIGNER_KEY_REF,
          publicKey: ADMIN_PUBLIC_KEY,
        }),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      key: SIGNER_KEY_REF,
    });

    await expect(scheduleSign(args)).rejects.toThrow('Schedule sign failed');
    expect(saveScheduledMock).not.toHaveBeenCalled();
  });
});
