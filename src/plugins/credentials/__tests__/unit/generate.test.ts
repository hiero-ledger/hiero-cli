import {
  makeAliasMock,
  makeArgs,
  makeConfigMock,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import {
  credentialsGenerate,
  CredentialsGenerateOutputSchema,
} from '@/plugins/credentials/commands/generate';

const setup = () => {
  const logger = makeLogger();
  const kms = makeKmsMock();
  const alias = makeAliasMock();
  const network = makeNetworkMock(SupportedNetwork.TESTNET);
  const config = makeConfigMock();

  kms.createLocalPrivateKey.mockReturnValue({
    keyRefId: 'kr_generated',
    publicKey: '02' + 'a'.repeat(64),
  });

  return { logger, kms, alias, network, config };
};

describe('credentials plugin - generate command', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generates an ECDSA key by default and returns it without an alias', async () => {
    const { kms, alias, network, config, logger } = setup();
    const args = makeArgs({ kms, alias, network, config, logger }, {});

    const result = await credentialsGenerate(args);
    const output = assertOutput(result.result, CredentialsGenerateOutputSchema);

    expect(kms.createLocalPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      KeyManager.local,
      expect.any(Array),
    );
    expect(output.keyRefId).toBe('kr_generated');
    expect(output.keyAlgorithm).toBe(KeyAlgorithm.ECDSA);
    expect(output.alias).toBeUndefined();
    expect(alias.register).not.toHaveBeenCalled();
    // private key must never appear in output
    expect(JSON.stringify(output)).not.toContain('privateKey');
  });

  test('registers a Key alias when --alias is provided', async () => {
    const { kms, alias, network, config, logger } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger },
      { alias: 'mykey' },
    );

    const result = await credentialsGenerate(args);
    const output = assertOutput(result.result, CredentialsGenerateOutputSchema);

    expect(alias.availableOrThrow).toHaveBeenCalledWith(
      'mykey',
      SupportedNetwork.TESTNET,
    );
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'mykey',
        type: AliasType.Key,
        network: SupportedNetwork.TESTNET,
        keyRefId: 'kr_generated',
        publicKey: '02' + 'a'.repeat(64),
      }),
    );
    expect(output.alias).toBe('mykey');
    expect(output.network).toBe(SupportedNetwork.TESTNET);
  });

  test('honors --key-type and --key-manager overrides', async () => {
    const { kms, alias, network, config, logger } = setup();
    const args = makeArgs(
      { kms, alias, network, config, logger },
      { keyType: KeyAlgorithm.ED25519, keyManager: KeyManager.local_encrypted },
    );

    const result = await credentialsGenerate(args);
    const output = assertOutput(result.result, CredentialsGenerateOutputSchema);

    expect(kms.createLocalPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ED25519,
      KeyManager.local_encrypted,
      expect.any(Array),
    );
    expect(output.keyAlgorithm).toBe(KeyAlgorithm.ED25519);
  });

  test('does not generate a key when the alias is already taken', async () => {
    const { kms, alias, network, config, logger } = setup();
    alias.availableOrThrow.mockImplementation(() => {
      throw new ValidationError('Alias "taken" already exists');
    });
    const args = makeArgs(
      { kms, alias, network, config, logger },
      { alias: 'taken' },
    );

    await expect(credentialsGenerate(args)).rejects.toThrow(ValidationError);
    expect(kms.createLocalPrivateKey).not.toHaveBeenCalled();
    expect(alias.register).not.toHaveBeenCalled();
  });
});
