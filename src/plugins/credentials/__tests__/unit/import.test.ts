import { ECDSA_HEX_PRIVATE_KEY } from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeArgs,
  makeConfigMock,
  makeKeyResolverMock,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import {
  CredentialType,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import {
  credentialsImport,
  CredentialsImportOutputSchema,
} from '@/plugins/credentials/commands/import';

const setup = () => {
  const logger = makeLogger();
  const kms = makeKmsMock();
  const alias = makeAliasMock();
  const network = makeNetworkMock(SupportedNetwork.TESTNET);
  const config = makeConfigMock();
  const keyResolver = makeKeyResolverMock({ kms, alias, network });

  keyResolver.resolveSigningKey.mockResolvedValue({
    keyRefId: 'kr_imported',
    publicKey: '02' + 'a'.repeat(64),
  });

  return { logger, kms, alias, network, config, keyResolver };
};

describe('credentials plugin - import command', () => {
  beforeEach(() => jest.clearAllMocks());

  test('imports a key and returns it without an alias', async () => {
    const { kms, alias, network, config, logger, keyResolver } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger, keyResolver },
      { key: ECDSA_HEX_PRIVATE_KEY },
    );

    const result = await credentialsImport(args);
    const output = assertOutput(result.result, CredentialsImportOutputSchema);

    expect(keyResolver.resolveSigningKey).toHaveBeenCalledWith(
      expect.objectContaining({ type: CredentialType.PRIVATE_KEY }),
      KeyManager.local,
      false,
    );
    expect(output.keyRefId).toBe('kr_imported');
    expect(output.alias).toBeUndefined();
    expect(alias.register).not.toHaveBeenCalled();
    expect(JSON.stringify(output)).not.toContain(ECDSA_HEX_PRIVATE_KEY);
  });

  test('registers a Key alias when --alias is provided', async () => {
    const { kms, alias, network, config, logger, keyResolver } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger, keyResolver },
      { key: ECDSA_HEX_PRIVATE_KEY, alias: 'mykey' },
    );

    const result = await credentialsImport(args);
    const output = assertOutput(result.result, CredentialsImportOutputSchema);

    expect(alias.availableOrThrow).toHaveBeenCalledWith(
      'mykey',
      SupportedNetwork.TESTNET,
    );
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'mykey',
        type: AliasType.Key,
        keyRefId: 'kr_imported',
      }),
    );
    expect(output.alias).toBe('mykey');
  });

  test('honors --key-manager override', async () => {
    const { kms, alias, network, config, logger, keyResolver } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger, keyResolver },
      {
        key: ECDSA_HEX_PRIVATE_KEY,
        keyManager: KeyManager.local_encrypted,
      },
    );

    await credentialsImport(args);

    expect(keyResolver.resolveSigningKey).toHaveBeenCalledWith(
      expect.objectContaining({ type: CredentialType.PRIVATE_KEY }),
      KeyManager.local_encrypted,
      false,
    );
  });

  test('does not import a key when the alias is already taken', async () => {
    const { kms, alias, network, config, logger, keyResolver } = setup();
    alias.availableOrThrow.mockImplementation(() => {
      throw new ValidationError('Alias "taken" already exists');
    });
    const args = makeArgs(
      { kms, alias, network, config, logger, keyResolver },
      { key: ECDSA_HEX_PRIVATE_KEY, alias: 'taken' },
    );

    await expect(credentialsImport(args)).rejects.toThrow(ValidationError);
    expect(keyResolver.resolveSigningKey).not.toHaveBeenCalled();
    expect(alias.register).not.toHaveBeenCalled();
  });

  test('requires --key', async () => {
    const { kms, alias, network, config, logger, keyResolver } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger, keyResolver },
      {},
    );

    await expect(credentialsImport(args)).rejects.toThrow();
    expect(keyResolver.resolveSigningKey).not.toHaveBeenCalled();
  });
});
