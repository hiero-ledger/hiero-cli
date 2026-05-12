import type { KeyResolverService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeConfigMock, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  scheduleCreate,
  ScheduleCreateOutputSchema,
} from '@/plugins/schedule/commands/create';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import {
  ADMIN_KEY_REF,
  ADMIN_PUBLIC_KEY,
  PAYER_ACCOUNT_ID,
  PAYER_KEY_REF_ID,
  SCHEDULE_COMPOSED_KEY,
  SCHEDULE_NAME,
} from './helpers/fixtures';
import { makeLogger, makeScheduleArgs } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandScheduleStateHelper: jest.fn(),
}));

const MockedScheduleHelper = ZustandScheduleStateHelper as jest.Mock;

describe('schedule plugin — create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saves a new schedule record and returns structured output', async () => {
    const logger = makeLogger();
    const saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(false),
      saveScheduled: saveScheduledMock,
    }));

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      waitForExpiry: false,
    });

    const result = await scheduleCreate(args);

    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        name: SCHEDULE_NAME,
        network: SupportedNetwork.TESTNET,
        keyManager: KeyManager.local,
        scheduled: false,
        executed: false,
        waitForExpiry: false,
      }),
    );
    expect(saveScheduledMock.mock.calls[0][1].createdAt).toEqual(
      expect.any(String),
    );

    const output = assertOutput(result.result, ScheduleCreateOutputSchema);
    expect(output.name).toBe(SCHEDULE_NAME);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.waitForExpiry).toBe(false);
  });

  test('throws ValidationError when a schedule with the same name already exists', async () => {
    const logger = makeLogger();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(true),
      saveScheduled: jest.fn(),
    }));

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      waitForExpiry: false,
    });

    await expect(scheduleCreate(args)).rejects.toThrow(ValidationError);
    await expect(scheduleCreate(args)).rejects.toThrow(
      /Schedule with name 'test-schedule' already exists/,
    );
  });

  test('resolves admin key and persists admin refs when --admin-key is set', async () => {
    const logger = makeLogger();
    const saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(false),
      saveScheduled: saveScheduledMock,
    }));

    const resolveSigningKeyMock = jest.fn().mockResolvedValue({
      keyRefId: ADMIN_KEY_REF,
      publicKey: ADMIN_PUBLIC_KEY,
    });

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: resolveSigningKeyMock,
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      adminKey: ADMIN_KEY_REF,
      waitForExpiry: false,
    });

    const result = await scheduleCreate(args);

    expect(resolveSigningKeyMock).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local,
      false,
      ['schedule:admin'],
    );
    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        adminKeyRefId: ADMIN_KEY_REF,
        adminPublicKey: ADMIN_PUBLIC_KEY,
      }),
    );

    const output = assertOutput(result.result, ScheduleCreateOutputSchema);
    expect(output.adminPublicKey).toBe(ADMIN_PUBLIC_KEY);
  });

  test('resolves payer account credentials when --payer-account is set', async () => {
    const logger = makeLogger();
    const saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(false),
      saveScheduled: saveScheduledMock,
    }));

    const resolveAccountCredentialsMock = jest.fn().mockResolvedValue({
      keyRefId: PAYER_KEY_REF_ID,
      accountId: PAYER_ACCOUNT_ID,
      publicKey: ADMIN_PUBLIC_KEY,
    });

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: resolveAccountCredentialsMock,
      } as unknown as KeyResolverService,
    };

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      payerAccount: PAYER_ACCOUNT_ID,
      waitForExpiry: false,
    });

    const result = await scheduleCreate(args);

    expect(resolveAccountCredentialsMock).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local,
      true,
    );
    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        payerAccountId: PAYER_ACCOUNT_ID,
        payerKeyRefId: PAYER_KEY_REF_ID,
      }),
    );

    const output = assertOutput(result.result, ScheduleCreateOutputSchema);
    expect(output.payerAccountId).toBe(PAYER_ACCOUNT_ID);
  });

  test('persists memo, expiration, and waitForExpiry', async () => {
    const logger = makeLogger();
    const saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(false),
      saveScheduled: saveScheduledMock,
    }));

    const expiration = new Date(Date.now() + 10 * 86400000);
    const memo = 'vote proposal';

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    configMock.getOption = jest.fn().mockReturnValue(KeyManager.local);

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      memo,
      expiration: expiration.toISOString(),
      waitForExpiry: true,
    });

    const result = await scheduleCreate(args);

    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        memo,
        expirationTime: expiration.toISOString(),
        waitForExpiry: true,
      }),
    );

    const output = assertOutput(result.result, ScheduleCreateOutputSchema);
    expect(output.memo).toBe(memo);
    expect(output.expirationTime).toBe(expiration.toISOString());
    expect(output.waitForExpiry).toBe(true);
  });

  test('uses key manager from args when provided', async () => {
    const logger = makeLogger();
    const saveScheduledMock = jest.fn();
    MockedScheduleHelper.mockImplementation(() => ({
      hasScheduled: jest.fn().mockReturnValue(false),
      saveScheduled: saveScheduledMock,
    }));

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const configMock = makeConfigMock();
    const getOptionSpy = jest.fn();

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveSigningKey: jest.fn(),
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };
    configMock.getOption = getOptionSpy;

    const args = makeScheduleArgs(api, logger, {
      name: SCHEDULE_NAME,
      keyManager: KeyManager.local_encrypted,
      waitForExpiry: false,
    });

    await scheduleCreate(args);

    expect(getOptionSpy).not.toHaveBeenCalled();
    expect(saveScheduledMock).toHaveBeenCalledWith(
      SCHEDULE_COMPOSED_KEY,
      expect.objectContaining({
        keyManager: KeyManager.local_encrypted,
      }),
    );
  });
});
