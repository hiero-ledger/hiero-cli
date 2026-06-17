import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { CredentialsListOutputSchema } from '@/plugins/credentials/commands/list';
import { credentialsList } from '@/plugins/credentials/commands/list/handler';

describe('credentials plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays message when no credentials are stored', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockReturnValue([]);

    const args = makeArgs({ kms: kmsService, logger }, {});

    const result = await credentialsList(args);
    const output = assertOutput(result.result, CredentialsListOutputSchema);

    expect(output.credentials).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('displays credentials when available', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const mockCredentials = [
      {
        keyRefId: 'kr_test123',
        keyManager: KeyManager.local,
        publicKey:
          '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        keyAlgorithm: KeyAlgorithm.ECDSA,
        labels: ['test', 'dev'],
      },
      {
        keyRefId: 'kr_test456',
        keyManager: KeyManager.local_encrypted,
        publicKey:
          '02bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
    ];

    kmsService.list.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService, logger }, {});

    const result = await credentialsList(args);
    const output = assertOutput(result.result, CredentialsListOutputSchema);

    expect(output.totalCount).toBe(2);
    expect(output.credentials).toHaveLength(2);
    expect(output.credentials[0]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test123',
        publicKey:
          '02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );
    expect(output.credentials[1]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_test456',
        publicKey:
          '02bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
    );
  });

  test('annotates credentials with their current-network Key alias and keyAlgorithm', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);

    kmsService.list.mockReturnValue([
      {
        keyRefId: 'kr_one',
        keyManager: KeyManager.local,
        publicKey: '02' + 'a'.repeat(64),
        labels: [],
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
      {
        keyRefId: 'kr_two',
        keyManager: KeyManager.local,
        publicKey: '02' + 'b'.repeat(64),
        labels: [],
        keyAlgorithm: KeyAlgorithm.ED25519,
      },
    ]);

    aliasService.list.mockReturnValue([
      {
        alias: 'mykey',
        type: AliasType.Key,
        network: SupportedNetwork.TESTNET,
        publicKey: '02' + 'a'.repeat(64),
        keyRefId: 'kr_one',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const args = makeArgs(
      { kms: kmsService, alias: aliasService, network: networkService, logger },
      {},
    );

    const result = await credentialsList(args);
    const output = assertOutput(result.result, CredentialsListOutputSchema);

    expect(aliasService.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: AliasType.Key,
    });
    expect(output.credentials[0]).toEqual(
      expect.objectContaining({
        keyRefId: 'kr_one',
        keyAlgorithm: KeyAlgorithm.ECDSA,
        alias: 'mykey',
      }),
    );
    expect(output.credentials[1].alias).toBeUndefined();
    expect(output.credentials[1].keyAlgorithm).toBe(KeyAlgorithm.ED25519);
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.list.mockImplementation(() => {
      throw new InternalError('KMS service error');
    });

    const args = makeArgs({ kms: kmsService, logger }, {});

    await expect(credentialsList(args)).rejects.toThrow('KMS service error');
  });
});
