import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { ImportAccountOutput } from '@/plugins/account/commands/import';

import '@/core/utils/json-serialize';

import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { KeyAlgorithm } from '@/core/shared/constants';
import { ValidationError } from '@/core/errors';
import { importAccount } from '@/plugins/account/commands/import/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - import command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('imports account successfully', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      hasAccount: jest.fn().mockReturnValue(false),
      saveAccount: saveAccountMock,
    }));

    const mirrorMock = makeMirrorMock();
    const networkMock = makeNetworkMock();
    const kms = makeKmsMock();
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as NetworkService,
      kms,
      alias,
      logger,
    };

    const args = makeArgs(api, logger, {
      key: '0.0.9999:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      name: 'imported',
    });

    const result = await importAccount(args);

    expect(kms.importAndValidatePrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      'pubKey',
      'local',
    );
    expect(mirrorMock.getAccount).toHaveBeenCalledWith('0.0.9999');
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'imported',
        type: 'account',
        network: 'testnet',
        entityId: '0.0.9999',
        publicKey: 'pub-key-test',
        keyRefId: 'kr_test123',
      }),
    );
    expect(saveAccountMock).toHaveBeenCalledWith(
      'imported',
      expect.objectContaining({
        name: 'imported',
        accountId: '0.0.9999',
        network: 'testnet',
        keyRefId: 'kr_test123',
        evmAddress: '0xabc',
      }),
    );

    const output = result.result as ImportAccountOutput;
    expect(output.accountId).toBe('0.0.9999');
    expect(output.name).toBe('imported');
    expect(output.type).toBe(KeyAlgorithm.ECDSA);
    expect(output.alias).toBe('imported');
    expect(output.network).toBe('testnet');
    expect(output.evmAddress).toBe('0xabc');
  });

  test('returns failure if account already exists', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      hasAccount: jest.fn().mockReturnValue(true),
      saveAccount: jest.fn(),
    }));

    const mirrorMock = makeMirrorMock();
    const networkMock = makeNetworkMock();
    const kms = makeKmsMock();
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as NetworkService,
      kms,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      key: '0.0.1111:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      alias: 'test',
    });

    await expect(importAccount(args)).rejects.toThrow(ValidationError);
  });

  test('throws error when mirror.getAccount fails', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      hasAccount: jest.fn().mockReturnValue(false),
      saveAccount: jest.fn(),
    }));

    const mirrorMock = makeMirrorMock({
      getAccountImpl: jest.fn().mockRejectedValue(new Error('mirror down')),
    });
    const networkMock = makeNetworkMock();
    const kms = makeKmsMock();
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as NetworkService,
      kms,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      key: '0.0.2222:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    });

    await expect(importAccount(args)).rejects.toThrow();
  });
});
