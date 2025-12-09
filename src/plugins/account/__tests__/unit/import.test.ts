import '../../../../core/utils/json-serialize';
import { importAccount } from '../../commands/import/handler';
import type { ImportAccountOutput } from '../../commands/import';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import type { HederaMirrornodeService } from '../../../../core/services/mirrornode/hedera-mirrornode-service.interface';
import { Status, KeyAlgorithm } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
  makeNetworkMock,
  makeKmsMock,
  makeAliasMock,
  makeMirrorMock,
} from '../../../../__tests__/mocks/mocks';
import { NetworkService } from '../../../../core/services/network/network-service.interface';

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

    expect(kms.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      'local',
      ['account:import', 'account:imported'],
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

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportAccountOutput = JSON.parse(result.outputJson!);
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
      state: {} as any,
    };

    const args = makeArgs(api, logger, {
      key: '0.0.1111:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      alias: 'test',
    });

    const result = await importAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Account with name 'imported-0-0-1111' already exists",
    );
  });

  test('returns failure when mirror.getAccount throws', async () => {
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
      state: {} as any,
    };

    const args = makeArgs(api, logger, {
      key: '0.0.2222:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    });

    const result = await importAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('mirror down');
  });
});
