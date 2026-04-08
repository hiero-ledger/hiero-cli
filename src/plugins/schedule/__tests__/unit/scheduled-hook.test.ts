import type { Transaction } from '@hashgraph/sdk';
import type { CoreApi, TransactionResult } from '@/core';
import type { PreSignTransactionParams } from '@/core/hooks/types';
import type { BaseBuildTransactionResult } from '@/core/types/transaction.types';
import type { ScheduledNormalizedParams } from '@/plugins/schedule/hooks/scheduled/types';

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
import {
  NotFoundError,
  StateError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { ScheduledHook } from '@/plugins/schedule/hooks/scheduled/handler';
import { ScheduledOutputSchema } from '@/plugins/schedule/hooks/scheduled/output';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import {
  ADMIN_KEY_REF,
  ADMIN_PUBLIC_KEY,
  DELETE_SUCCESS_TX_ID,
  ON_CHAIN_SCHEDULE_ID,
  PAYER_KEY_REF_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
} from './helpers/fixtures';

jest.mock('../../zustand-state-helper', () => ({
  ZustandScheduleStateHelper: jest.fn(),
}));

const MockedZustand = ZustandScheduleStateHelper as unknown as jest.Mock;

const HOOK_COMMAND_NAME = 'account_create';

function makePreSignParams(
  keyRefIds: string[],
): PreSignTransactionParams<
  ScheduledNormalizedParams,
  BaseBuildTransactionResult
> {
  return {
    normalisedParams: {
      keyRefIds: [...keyRefIds],
    } as ScheduledNormalizedParams,
    buildTransactionResult: {
      transaction: createMockTransaction() as unknown as Transaction,
    },
  };
}

describe('schedule plugin — scheduled hook', () => {
  let getScheduledMock: jest.Mock;
  let saveScheduledMock: jest.Mock;
  let hook: ScheduledHook;

  beforeEach(() => {
    jest.clearAllMocks();
    getScheduledMock = jest.fn();
    saveScheduledMock = jest.fn();
    MockedZustand.mockImplementation(() => ({
      getScheduled: getScheduledMock,
      saveScheduled: saveScheduledMock,
    }));
    hook = new ScheduledHook();
  });

  test('no-ops when --scheduled is not set', async () => {
    const logger = makeLogger();
    logger.debug = jest.fn();

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, {});
    const params = makePreSignParams(['kr_base']);

    const result = await hook.preSignTransactionHook(
      args,
      params,
      HOOK_COMMAND_NAME,
    );

    expect(result.breakFlow).toBe(false);
    expect(result.result).toMatchObject({
      message: 'No "scheduled" parameter found',
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('No parameter "scheduled" found'),
    );
    expect(getScheduledMock).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when schedule record is missing', async () => {
    const logger = makeLogger();
    getScheduledMock.mockReturnValue(undefined);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, { scheduled: SCHEDULE_NAME });
    const params = makePreSignParams(['kr_base']);

    await expect(
      hook.preSignTransactionHook(args, params, HOOK_COMMAND_NAME),
    ).rejects.toThrow(
      new NotFoundError(`Scheduled not found for name ${SCHEDULE_NAME}`),
    );
  });

  test('throws ValidationError when schedule was already used', async () => {
    const logger = makeLogger();
    getScheduledMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduled: true,
      executed: false,
      scheduledId: ON_CHAIN_SCHEDULE_ID,
    });

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
    };

    const args = makeArgs(api, logger, { scheduled: SCHEDULE_NAME });
    const params = makePreSignParams(['kr_base']);

    await expect(
      hook.preSignTransactionHook(args, params, HOOK_COMMAND_NAME),
    ).rejects.toThrow(new ValidationError('Transaction is already scheduled'));
  });

  test('wraps inner tx in ScheduleCreate, signs, persists state, and returns hook output', async () => {
    const logger = makeLogger();
    logger.info = jest.fn();

    const innerTx = createMockTransaction() as unknown as Transaction;
    const buildScheduleCreateTransaction = jest.fn().mockReturnValue({
      scheduleOuter: true,
    });

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleCreateTransaction =
      buildScheduleCreateTransaction;

    const txSign = makeTxSignMock();
    const signedOuter = createMockTransaction();
    txSign.sign = jest.fn().mockResolvedValue(signedOuter);

    const executeResult: TransactionResult = {
      success: true,
      scheduleId: ON_CHAIN_SCHEDULE_ID,
      transactionId: DELETE_SUCCESS_TX_ID,
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

    getScheduledMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduled: false,
      executed: false,
      adminPublicKey: ADMIN_PUBLIC_KEY,
      adminKeyRefId: ADMIN_KEY_REF,
      payerKeyRefId: PAYER_KEY_REF_ID,
      payerAccountId: '0.0.3',
      memo: 'memo',
      expirationTime: new Date(Date.now() + 86400000).toISOString(),
      waitForExpiry: true,
    });

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      schedule: scheduleService,
      txSign,
      txExecute,
    };

    const keyRefIds = ['kr_command_signer'];
    const args = makeArgs(api, logger, { scheduled: SCHEDULE_NAME });
    const params: PreSignTransactionParams<
      ScheduledNormalizedParams,
      BaseBuildTransactionResult
    > = {
      normalisedParams: {
        keyRefIds: [...keyRefIds],
      } as ScheduledNormalizedParams,
      buildTransactionResult: {
        transaction: innerTx,
      },
    };

    const result = await hook.preSignTransactionHook(
      args,
      params,
      HOOK_COMMAND_NAME,
    );

    expect(buildScheduleCreateTransaction).toHaveBeenCalledWith({
      innerTransaction: innerTx,
      payerAccountId: '0.0.3',
      adminKey: ADMIN_PUBLIC_KEY,
      scheduleMemo: 'memo',
      expirationTime: expect.any(Date),
      waitForExpiry: true,
    });
    expect(txSign.sign).toHaveBeenCalledWith({ scheduleOuter: true }, [
      'kr_command_signer',
      ADMIN_KEY_REF,
      PAYER_KEY_REF_ID,
    ]);
    expect(txExecute.execute).toHaveBeenCalledWith(signedOuter);

    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        scheduledId: ON_CHAIN_SCHEDULE_ID,
        scheduled: true,
        executed: false,
        command: HOOK_COMMAND_NAME,
        transactionId: DELETE_SUCCESS_TX_ID,
      }),
    );

    expect(result.breakFlow).toBe(true);
    expect(result.schema).toBe(ScheduledOutputSchema);
    expect(result.humanTemplate).toBeDefined();

    const output = assertOutput(result.result, ScheduledOutputSchema);
    expect(output.scheduledName).toBe(SCHEDULE_NAME);
    expect(output.scheduledId).toBe(ON_CHAIN_SCHEDULE_ID);
    expect(output.transactionId).toBe(DELETE_SUCCESS_TX_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
  });

  test('throws TransactionError when execution fails', async () => {
    const logger = makeLogger();
    getScheduledMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduled: false,
      executed: false,
    });

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleCreateTransaction = jest
      .fn()
      .mockReturnValue({});

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue({
      success: false,
      transactionId: DELETE_SUCCESS_TX_ID,
      receipt: {
        status: {
          status: 'failed',
          transactionId: DELETE_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    } satisfies TransactionResult);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      schedule: scheduleService,
      txSign,
      txExecute,
    };

    const args = makeArgs(api, logger, { scheduled: SCHEDULE_NAME });
    const params = makePreSignParams(['kr_base']);

    await expect(
      hook.preSignTransactionHook(args, params, HOOK_COMMAND_NAME),
    ).rejects.toThrow(
      new TransactionError(
        `Failed to create account (txId: ${DELETE_SUCCESS_TX_ID})`,
        false,
      ),
    );
  });

  test('throws StateError when receipt has no schedule id', async () => {
    const logger = makeLogger();
    getScheduledMock.mockReturnValue({
      name: SCHEDULE_NAME,
      network: SupportedNetwork.TESTNET,
      keyManager: KeyManager.local,
      scheduled: false,
      executed: false,
    });

    const scheduleService = makeScheduleTransactionServiceMock();
    scheduleService.buildScheduleCreateTransaction = jest
      .fn()
      .mockReturnValue({});

    const txSign = makeTxSignMock();
    txSign.sign = jest.fn().mockResolvedValue(createMockTransaction());
    const txExecute = makeTxExecuteMock();
    txExecute.execute = jest.fn().mockResolvedValue({
      success: true,
      scheduleId: undefined,
      transactionId: DELETE_SUCCESS_TX_ID,
      receipt: {
        status: {
          status: 'success',
          transactionId: DELETE_SUCCESS_TX_ID,
        },
      },
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    } satisfies TransactionResult);

    const api: Partial<CoreApi> = {
      network: makeNetworkMock(SupportedNetwork.TESTNET),
      config: makeConfigMock(),
      schedule: scheduleService,
      txSign,
      txExecute,
    };

    const args = makeArgs(api, logger, { scheduled: SCHEDULE_NAME });
    const params = makePreSignParams(['kr_base']);

    await expect(
      hook.preSignTransactionHook(args, params, HOOK_COMMAND_NAME),
    ).rejects.toThrow(
      new StateError(
        'Transaction completed but did not return an schedule ID, unable to derive addresses',
      ),
    );
  });
});
