import type { CoreApi, KeyResolverService, TransactionResult } from '@/core';
import type { ScheduleInfo } from '@/core/services/mirrornode/types';

import { ECDSA_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
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
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  scheduleDelete,
  ScheduleDeleteOutputSchema,
} from '@/plugins/schedule/commands/delete';
import { ScheduleResolverServiceImpl } from '@/plugins/schedule/services/schedule-resolver.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';

import {
  ADMIN_KEY_REF,
  DELETE_SUCCESS_TX_ID,
  ON_CHAIN_SCHEDULE_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
} from './helpers/fixtures';

jest.mock('../../services/schedule-resolver.service', () => ({
  ScheduleResolverServiceImpl: jest.fn(),
}));
jest.mock('../../services/schedule-state.service', () => ({
  ScheduleStateServiceImpl: jest.fn(),
}));

const MockedScheduleResolver =
  ScheduleResolverServiceImpl as unknown as jest.Mock;
const MockedScheduleState = ScheduleStateServiceImpl as unknown as jest.Mock;

const ADMIN_KEY_REF_2 = 'kr_admintest456';

function resolvedSchedule(overrides: Record<string, unknown> = {}) {
  return {
    name: SCHEDULE_NAME,
    scheduleId: ON_CHAIN_SCHEDULE_ID,
    scheduled: true,
    executed: false,
    adminKeyRefIds: [ADMIN_KEY_REF],
    ...overrides,
  };
}

function makeScheduleInfo(
  adminKey: ScheduleInfo['admin_key'] = {
    _type: MirrorNodeKeyType.ED25519,
    key: ECDSA_HEX_PUBLIC_KEY,
  },
): Partial<ScheduleInfo> {
  return {
    schedule_id: ON_CHAIN_SCHEDULE_ID,
    admin_key: adminKey,
    deleted: false,
    wait_for_expiry: false,
    consensus_timestamp: '1700000000.000000000',
    creator_account_id: '0.0.1000',
    payer_account_id: '0.0.1000',
    memo: '',
  };
}

describe('schedule plugin — delete command', () => {
  let deleteScheduledMock: jest.Mock;
  let resolveScheduleMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    deleteScheduledMock = jest.fn();
    resolveScheduleMock = jest.fn();
    MockedScheduleState.mockImplementation(() => ({
      deleteScheduled: deleteScheduledMock,
    }));
    MockedScheduleResolver.mockImplementation(() => ({
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

  test('submits ScheduleDeleteTransaction using single key auto-detected from mirror node', async () => {
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

    const resolveSigningKeysMock = jest
      .fn()
      .mockResolvedValue({ keyRefIds: [ADMIN_KEY_REF], requiredSignatures: 1 });

    const keyResolver = {
      resolveSigningKeys: resolveSigningKeysMock,
    } as unknown as KeyResolverService;

    const getScheduledMock = jest.fn().mockResolvedValue(
      makeScheduleInfo({
        _type: MirrorNodeKeyType.ED25519,
        key: ECDSA_HEX_PUBLIC_KEY,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      keyResolver,
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as CoreApi['mirror'],
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    const result = await scheduleDelete(args);

    expect(resolveScheduleMock).toHaveBeenCalledTimes(2);
    expect(getScheduledMock).toHaveBeenCalledWith(ON_CHAIN_SCHEDULE_ID);
    expect(resolveSigningKeysMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mirrorRoleKey: {
          _type: MirrorNodeKeyType.ED25519,
          key: ECDSA_HEX_PUBLIC_KEY,
        },
        explicitCredentials: [],
      }),
    );
    expect(buildScheduleDeleteTransaction).toHaveBeenCalledWith({
      scheduleId: ON_CHAIN_SCHEDULE_ID,
    });
    expect(txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      ADMIN_KEY_REF,
    ]);
    expect(txExecute.execute).toHaveBeenCalled();
    expect(deleteScheduledMock).toHaveBeenCalledWith(SCHEDULE_COMPOSED_KEY);

    const output = assertOutput(result.result, ScheduleDeleteOutputSchema);
    expect(output.transactionId).toBe(DELETE_SUCCESS_TX_ID);
    expect(output.name).toBe(SCHEDULE_NAME);
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
  });

  test('submits ScheduleDeleteTransaction with multiple explicit admin keys (threshold key scenario)', async () => {
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
      success: true,
      receipt: {
        status: { status: 'success', transactionId: DELETE_SUCCESS_TX_ID },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    } satisfies TransactionResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const resolveSigningKeysMock = jest.fn().mockResolvedValue({
      keyRefIds: [ADMIN_KEY_REF, ADMIN_KEY_REF_2],
      requiredSignatures: 2,
    });

    const keyResolver = {
      resolveSigningKeys: resolveSigningKeysMock,
    } as unknown as KeyResolverService;

    const getScheduledMock = jest
      .fn()
      .mockResolvedValue(
        makeScheduleInfo({ _type: 'ProtobufEncoded', key: '0xdeadbeef' }),
      );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      keyResolver,
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as CoreApi['mirror'],
    };

    const args = makeArgs(api, logger, {
      schedule: SCHEDULE_NAME,
      adminKey: [ADMIN_KEY_REF, ADMIN_KEY_REF_2],
    });

    const result = await scheduleDelete(args);

    expect(resolveSigningKeysMock).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitCredentials: expect.arrayContaining([
          expect.objectContaining({ keyReference: ADMIN_KEY_REF }),
          expect.objectContaining({ keyReference: ADMIN_KEY_REF_2 }),
        ]),
      }),
    );
    expect(txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      ADMIN_KEY_REF,
      ADMIN_KEY_REF_2,
    ]);

    const output = assertOutput(result.result, ScheduleDeleteOutputSchema);
    expect(output.transactionId).toBe(DELETE_SUCCESS_TX_ID);
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
        status: { status: 'failed', transactionId: DELETE_SUCCESS_TX_ID },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    } satisfies TransactionResult);

    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const getScheduledMock = jest.fn().mockResolvedValue(
      makeScheduleInfo({
        _type: MirrorNodeKeyType.ED25519,
        key: ECDSA_HEX_PUBLIC_KEY,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      txSign,
      txExecute,
      keyResolver: {
        resolveSigningKeys: jest.fn().mockResolvedValue({
          keyRefIds: [ADMIN_KEY_REF],
          requiredSignatures: 1,
        }),
      } as unknown as KeyResolverService,
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as CoreApi['mirror'],
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    await expect(scheduleDelete(args)).rejects.toThrow(
      'Schedule delete failed',
    );
    expect(deleteScheduledMock).not.toHaveBeenCalled();
  });

  test('throws ValidationError when schedule has no admin key on the network', async () => {
    const logger = makeLogger();
    resolveScheduleMock.mockResolvedValue(resolvedSchedule());

    const scheduleService = makeScheduleTransactionServiceMock();
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const getScheduledMock = jest
      .fn()
      .mockResolvedValue(makeScheduleInfo(null));

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: configMock,
      schedule: scheduleService,
      keyResolver: {
        resolveSigningKeys: jest
          .fn()
          .mockRejectedValue(
            new Error(
              'Schedule has no admin key on the network; it cannot be deleted with ScheduleDeleteTransaction.',
            ),
          ),
      } as unknown as KeyResolverService,
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as CoreApi['mirror'],
    };

    const args = makeArgs(api, logger, { schedule: SCHEDULE_NAME });

    await expect(scheduleDelete(args)).rejects.toThrow(
      'Schedule has no admin key on the network',
    );
    expect(deleteScheduledMock).not.toHaveBeenCalled();
  });
});
