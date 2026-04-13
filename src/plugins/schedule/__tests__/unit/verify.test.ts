import type {
  CoreApi,
  HederaMirrornodeService,
  KeyResolverService,
} from '@/core';
import type { Hook } from '@/core/hooks/hook.interface';
import type { HookPhase } from '@/core/plugins/plugin.types';
import type { ScheduleInfo } from '@/core/services/mirrornode/types';

import {
  makeArgs,
  makeConfigMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  scheduleVerify,
  ScheduleVerifyOutputSchema,
} from '@/plugins/schedule/commands/verify';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import {
  INNER_TRANSACTION_ID,
  MIRROR_CONSENSUS_TS,
  ON_CHAIN_SCHEDULE_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
} from './helpers/fixtures';

jest.mock('../../zustand-state-helper', () => ({
  ZustandScheduleStateHelper: jest.fn(),
}));

const MockedZustand = ZustandScheduleStateHelper as unknown as jest.Mock;

function baseMirrorSchedule(
  overrides: Partial<ScheduleInfo> = {},
): ScheduleInfo {
  return {
    schedule_id: ON_CHAIN_SCHEDULE_ID,
    consensus_timestamp: MIRROR_CONSENSUS_TS,
    creator_account_id: '0.0.1',
    deleted: false,
    executed_timestamp: null,
    expiration_time: null,
    memo: '',
    payer_account_id: '0.0.2',
    wait_for_expiry: false,
    ...overrides,
  };
}

describe('schedule plugin — verify command', () => {
  let getScheduledMock: jest.Mock;
  let getScheduledStateMock: jest.Mock;
  let saveScheduledMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getScheduledMock = jest.fn();
    getScheduledStateMock = jest.fn();
    saveScheduledMock = jest.fn();
    MockedZustand.mockImplementation(() => ({
      getScheduled: getScheduledStateMock,
      saveScheduled: saveScheduledMock,
    }));
  });

  test('throws NotFoundError when schedule id cannot be resolved from name or args', async () => {
    const logger = makeLogger();
    getScheduledStateMock.mockReturnValue(undefined);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
    };

    const args = makeArgs(api, logger, { name: SCHEDULE_NAME });

    await expect(scheduleVerify(args)).rejects.toThrow(NotFoundError);
    expect(getScheduledMock).not.toHaveBeenCalled();
  });

  test('verifies by schedule id only and returns mirror fields without local state', async () => {
    const logger = makeLogger();
    const mirrorPayload = baseMirrorSchedule({
      memo: 'hello',
      deleted: true,
      wait_for_expiry: true,
    });
    getScheduledMock.mockResolvedValue(mirrorPayload);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
    };

    const args = makeArgs(api, logger, { scheduleId: ON_CHAIN_SCHEDULE_ID });

    const result = await scheduleVerify(args);

    expect(getScheduledStateMock).not.toHaveBeenCalled();
    expect(getScheduledMock).toHaveBeenCalledWith(ON_CHAIN_SCHEDULE_ID);
    expect(saveScheduledMock).not.toHaveBeenCalled();

    const output = assertOutput(result.result, ScheduleVerifyOutputSchema);
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
    expect(output.name).toBeUndefined();
    expect(output.deleted).toBe(true);
    expect(output.waitForExpiry).toBe(true);
    expect(output.scheduleMemo).toBe('hello');
  });

  test('updates local record when name exists and not yet executed', async () => {
    const logger = makeLogger();
    getScheduledStateMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduledId: ON_CHAIN_SCHEDULE_ID,
      scheduled: true,
      executed: false,
    });
    getScheduledMock.mockResolvedValue(
      baseMirrorSchedule({
        executed_timestamp: null,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
    };

    const args = makeArgs(api, logger, { name: SCHEDULE_NAME });

    await scheduleVerify(args);

    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        executed: false,
        scheduled: true,
      }),
    );
  });

  test('imports mirror schedule into local state when name and schedule id are provided but no prior record', async () => {
    const logger = makeLogger();
    getScheduledStateMock.mockReturnValue(undefined);
    getScheduledMock.mockResolvedValue(baseMirrorSchedule());

    const getPublicKey = jest.fn().mockResolvedValue({
      keyRefId: 'kr_payer',
      publicKey: '02abc',
    });

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
      keyResolver: {
        getPublicKey,
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: jest.fn(),
        resolveDestination: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeArgs(api, logger, {
      name: SCHEDULE_NAME,
      scheduleId: ON_CHAIN_SCHEDULE_ID,
    });

    await scheduleVerify(args);

    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        name: SCHEDULE_NAME,
        network: SupportedNetwork.TESTNET,
        scheduled: true,
      }),
    );
  });

  test('runs custom verify hooks when execution completes and command is stored', async () => {
    const logger = makeLogger();
    getScheduledStateMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduledId: ON_CHAIN_SCHEDULE_ID,
      scheduled: true,
      executed: false,
      command: 'account_create',
      transactionId: INNER_TRANSACTION_ID,
    });
    getScheduledMock.mockResolvedValue(
      baseMirrorSchedule({
        executed_timestamp: MIRROR_CONSENSUS_TS,
      }),
    );

    const execute = jest.fn().mockResolvedValue({
      breakFlow: true,
      result: { hookResult: true },
    });
    const mockHook: Hook = { execute };
    const phaseHooks = new Map<HookPhase, Hook[]>();
    phaseHooks.set('postOutputPreparation', [mockHook]);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
    };

    const base = makeArgs(api, logger, { name: SCHEDULE_NAME });
    const args = { ...base, hooks: phaseHooks };

    const result = await scheduleVerify(args);

    expect(execute).toHaveBeenCalled();
    expect(result.result).toEqual({ hookResult: true });
  });

  test('does not invoke custom hooks when hooks are not registered', async () => {
    const logger = makeLogger();
    getScheduledStateMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduledId: ON_CHAIN_SCHEDULE_ID,
      scheduled: true,
      executed: false,
      command: 'account_create',
      transactionId: INNER_TRANSACTION_ID,
    });
    getScheduledMock.mockResolvedValue(
      baseMirrorSchedule({
        executed_timestamp: MIRROR_CONSENSUS_TS,
      }),
    );

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      mirror: {
        getScheduled: getScheduledMock,
      } as unknown as HederaMirrornodeService,
    };

    const args = makeArgs(api, logger, { name: SCHEDULE_NAME });

    const result = await scheduleVerify(args);

    const output = assertOutput(result.result, ScheduleVerifyOutputSchema);
    expect(output.executedAt).toBeDefined();
    expect(output.scheduleId).toBe(ON_CHAIN_SCHEDULE_ID);
  });
});
