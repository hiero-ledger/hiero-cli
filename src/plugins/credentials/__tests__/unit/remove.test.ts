import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import { ZodError } from 'zod';

import {
  makeAliasMock,
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { CredentialsRemoveOutputSchema } from '@/plugins/credentials/commands/remove';
import { credentialsRemove } from '@/plugins/credentials/commands/remove/handler';

describe('credentials plugin - remove command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCredentials: KmsCredentialRecord = {
    keyRefId: 'kr_test123',
    publicKey: 'pub-key-test',
    keyAlgorithm: KeyAlgorithm.ECDSA,
    keyManager: KeyManager.local,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('removes credentials successfully', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService, logger }, { id: 'kr_test123' });

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output).toEqual({ keyRefId: 'kr_test123' });
  });

  test('throws NotFoundError when credential does not exist', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(undefined);

    const args = makeArgs(
      { kms: kmsService, logger },
      {
        id: 'kr_nonexistent',
      },
    );

    await expect(credentialsRemove(args)).rejects.toThrow(NotFoundError);
    expect(kmsService.get).toHaveBeenCalledWith('kr_nonexistent');
    expect(kmsService.remove).not.toHaveBeenCalled();
  });

  test('removes credentials with valid id', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs({ kms: kmsService, logger }, { id: 'kr_test123' });

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(output.keyRefId).toBe('kr_test123');
  });

  test('propagates KMS service errors', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    kmsService.get.mockReturnValue(mockCredentials);
    kmsService.remove.mockImplementation(() => {
      throw new InternalError('KMS service error');
    });

    const args = makeArgs({ kms: kmsService, logger }, { id: 'kr_test123' });

    await expect(credentialsRemove(args)).rejects.toThrow('KMS service error');
    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
  });

  test('removes by alias: removes the KMS key and unregisters the alias', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);

    aliasService.resolveOrThrow.mockReturnValue({
      alias: 'mykey',
      type: AliasType.Key,
      network: SupportedNetwork.TESTNET,
      publicKey: 'pub-key-test',
      keyRefId: 'kr_test123',
      createdAt: '2024-01-01T00:00:00Z',
    });

    const args = makeArgs(
      { kms: kmsService, alias: aliasService, network: networkService, logger },
      { alias: 'mykey' },
    );

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(aliasService.resolveOrThrow).toHaveBeenCalledWith(
      'mykey',
      AliasType.Key,
      SupportedNetwork.TESTNET,
    );
    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(aliasService.remove).toHaveBeenCalledWith(
      'mykey',
      SupportedNetwork.TESTNET,
    );
    expect(output.keyRefId).toBe('kr_test123');
  });

  test('removes by id: also unregisters a linked Key alias', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);

    kmsService.get.mockReturnValue(mockCredentials);
    aliasService.list.mockReturnValue([
      {
        alias: 'mykey',
        type: AliasType.Key,
        network: SupportedNetwork.TESTNET,
        publicKey: 'pub-key-test',
        keyRefId: 'kr_test123',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const args = makeArgs(
      { kms: kmsService, alias: aliasService, network: networkService, logger },
      { id: 'kr_test123' },
    );

    const result = await credentialsRemove(args);
    const output = assertOutput(result.result, CredentialsRemoveOutputSchema);

    expect(kmsService.remove).toHaveBeenCalledWith('kr_test123');
    expect(aliasService.remove).toHaveBeenCalledWith(
      'mykey',
      SupportedNetwork.TESTNET,
    );
    expect(output.keyRefId).toBe('kr_test123');
  });

  test('throws ZodError when neither id nor alias is provided', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const args = makeArgs({ kms: kmsService, logger }, {});

    await expect(credentialsRemove(args)).rejects.toThrow(ZodError);
    expect(kmsService.remove).not.toHaveBeenCalled();
  });

  test('throws ZodError when both id and alias are provided', async () => {
    const logger = makeLogger();
    const kmsService = makeKmsMock();

    const args = makeArgs(
      { kms: kmsService, logger },
      { id: 'kr_test123', alias: 'mykey' },
    );

    await expect(credentialsRemove(args)).rejects.toThrow(ZodError);
    expect(kmsService.remove).not.toHaveBeenCalled();
  });
});
