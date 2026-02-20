import type { SetOperatorOutput } from '@/plugins/network/commands/set-operator/output';

import {
  ECDSA_DER_PRIVATE_KEY,
  MOCK_PUBLIC_KEY,
} from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { setOperatorHandler } from '@/plugins/network/commands/set-operator';

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  exitSpy = setupExitSpy();
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe('network plugin - set-operator command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sets operator using account-id:private-key format', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: `0.0.123456:${ECDSA_DER_PRIVATE_KEY}` },
    );

    const result = await setOperatorHandler(args);

    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: MOCK_PUBLIC_KEY,
    });
    expect(kmsService.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      ECDSA_DER_PRIVATE_KEY,
      'local',
      ['network:operator', 'network:testnet'],
    );
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('sets operator using alias', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    aliasService.resolve.mockReturnValue({
      alias: 'testnet1',
      type: 'account',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.789012',
      keyRefId: 'kr_alias123',
      publicKey:
        '302a300506032b65700321000000000000000000000000000000000000000000000000000000000000000000',
      createdAt: '2024-01-01T00:00:00Z',
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: 'testnet1' },
    );

    const result = await setOperatorHandler(args);

    expect(aliasService.resolve).toHaveBeenCalledWith(
      'testnet1',
      'account',
      'testnet',
    );
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.789012',
      keyRefId: 'kr_alias123',
    });
    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.789012',
      keyRefId: 'kr_alias123',
      publicKey:
        '302a300506032b65700321000000000000000000000000000000000000000000000000000000000000000000',
    });
  });

  test('sets operator for specific network when --network is provided', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
        network: 'mainnet',
      },
    );

    const result = await setOperatorHandler(args);

    expect(networkService.setOperator).toHaveBeenCalledWith('mainnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('mainnet');
  });

  test('shows overwrite message when operator already exists', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.999999',
      keyRefId: 'kr_old123',
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
      },
    );

    const result = await setOperatorHandler(args);

    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('shows new operator message when no existing operator', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    networkService.getOperator.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
      },
    );

    const result = await setOperatorHandler(args);

    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('throws when alias is not found', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    aliasService.resolve.mockReturnValue(null);

    const args = makeArgs(
      {
        network: networkService,
        kms: kmsService,
        alias: aliasService,
      },
      logger,
      { operator: 'nonexistent' },
    );

    await expect(setOperatorHandler(args)).rejects.toThrow(
      'No account is associated with the name provided.',
    );
  });

  test('throws when alias has no key', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    aliasService.resolve.mockReturnValue({
      alias: 'testnet1',
      type: 'account',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.789012',
      keyRefId: undefined,
      publicKey: undefined,
      createdAt: '2024-01-01T00:00:00Z',
    });

    const args = makeArgs(
      {
        network: networkService,
        kms: kmsService,
        alias: aliasService,
      },
      logger,
      { operator: 'testnet1' },
    );

    await expect(setOperatorHandler(args)).rejects.toThrow(
      'The account associated with the alias does not have an associated private/public key or accountId',
    );
  });

  test('throws when KMS importPrivateKey fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    kmsService.importPrivateKey.mockImplementation(() => {
      throw new Error('Invalid private key format');
    });

    const args = makeArgs(
      {
        network: networkService,
        kms: kmsService,
        alias: aliasService,
      },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
      },
    );

    await expect(setOperatorHandler(args)).rejects.toThrow(
      'Invalid private key format',
    );
  });

  test('throws when network service fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    networkService.setOperator.mockImplementation(() => {
      throw new Error('Network service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
      },
    );

    await expect(setOperatorHandler(args)).rejects.toThrow(
      'Network service error',
    );
  });

  test('throws ValidationError when network is not available', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    networkService.isNetworkAvailable.mockReturnValue(false);
    networkService.getAvailableNetworks.mockReturnValue([
      'testnet',
      'mainnet',
      'previewnet',
    ]);

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
        network: 'mainnet',
      },
    );

    await expect(setOperatorHandler(args)).rejects.toThrow(ValidationError);
  });

  test('displays all operator information after successful set', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {
        operator:
          '0.0.123456:2222222222222222222222222222222222222222222222222222222222222222',
      },
    );

    const result = await setOperatorHandler(args);

    const output = result.result as SetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: MOCK_PUBLIC_KEY,
    });
  });
});
