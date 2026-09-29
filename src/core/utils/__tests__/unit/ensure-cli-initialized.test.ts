import type { CoreApi } from '@/core';

import * as clack from '@clack/prompts';

import {
  makeConfigMock,
  makeKmsMock,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { ConfigurationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { ensureCliInitialized } from '@/core/utils/ensure-cli-initialized';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  text: jest.fn(),
  password: jest.fn(),
  confirm: jest.fn(),
  isCancel: jest.fn(),
  cancel: jest.fn(),
  log: { info: jest.fn() },
  CANCEL_SYMBOL: Symbol('clack:cancel'),
}));

const clackMock = jest.mocked(clack);
const CANCEL_SYMBOL: typeof clack.CANCEL_SYMBOL = clack.CANCEL_SYMBOL;

type ValidateFunction = (value: string | undefined) => string | undefined;

const ACCOUNT_ID = '0.0.1234';
const PRIVATE_KEY =
  '302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ACCOUNT_PUBLIC_KEY = 'public-key-from-mirror';
const KEY_REF_ID = 'imported-key-ref-id';

const setupApi = (
  options: {
    hasAnyOperator?: boolean;
    existingOperator?: boolean;
    outputFormat?: 'human' | 'json';
  } = {},
) => {
  const network = makeNetworkMock(SupportedNetwork.TESTNET);
  network.hasAnyOperator.mockReturnValue(options.hasAnyOperator ?? false);
  network.getOperator.mockReturnValue(
    options.existingOperator
      ? { accountId: ACCOUNT_ID, keyRefId: KEY_REF_ID }
      : null,
  );

  const kms = makeKmsMock();
  kms.importAndValidatePrivateKey.mockReturnValue({
    keyRefId: KEY_REF_ID,
    publicKey: ACCOUNT_PUBLIC_KEY,
  });

  const config = makeConfigMock();
  config.getOption.mockReturnValue(KeyManager.local_encrypted);

  const mirror = {
    getAccountOrThrow: jest.fn().mockResolvedValue({
      keyAlgorithm: KeyAlgorithm.ED25519,
      accountPublicKey: ACCOUNT_PUBLIC_KEY,
    }),
  };
  const output = {
    getFormat: jest.fn().mockReturnValue(options.outputFormat ?? 'human'),
  };

  const api = { network, kms, config, mirror, output } as unknown as CoreApi;

  return { api, network, kms, config, mirror };
};

describe('ensureCliInitialized', () => {
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clackMock.isCancel.mockImplementation(
      (value: unknown) => value === CANCEL_SYMBOL,
    );
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('does nothing when an operator is already configured', async () => {
    const { api } = setupApi({ existingOperator: true });

    await ensureCliInitialized(api);

    expect(clackMock.intro).not.toHaveBeenCalled();
    expect(clackMock.select).not.toHaveBeenCalled();
  });

  it('throws a ConfigurationError without prompting when output is not human', async () => {
    const { api } = setupApi({ outputFormat: 'json' });

    await expect(ensureCliInitialized(api)).rejects.toThrow(ConfigurationError);

    expect(clackMock.intro).not.toHaveBeenCalled();
  });

  describe('first-time setup', () => {
    const answerFirstTimePrompts = () => {
      clackMock.select
        .mockResolvedValueOnce(SupportedNetwork.PREVIEWNET)
        .mockResolvedValueOnce(KeyManager.local);
      clackMock.text.mockResolvedValueOnce(ACCOUNT_ID);
      clackMock.password.mockResolvedValueOnce(PRIVATE_KEY);
      clackMock.confirm.mockResolvedValueOnce(true);
    };

    it('switches network, stores global config and sets the operator', async () => {
      const { api, network, kms, config, mirror } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      expect(network.switchNetwork).toHaveBeenCalledWith(
        SupportedNetwork.PREVIEWNET,
      );
      expect(config.setOption).toHaveBeenCalledWith(
        ConfigOptionKey.ed25519_support,
        true,
      );
      expect(config.setOption).toHaveBeenCalledWith(
        ConfigOptionKey.default_key_manager,
        KeyManager.local,
      );
      expect(mirror.getAccountOrThrow).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(kms.importAndValidatePrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ED25519,
        PRIVATE_KEY,
        ACCOUNT_PUBLIC_KEY,
        KeyManager.local,
      );
      expect(network.setOperator).toHaveBeenCalledWith(
        SupportedNetwork.TESTNET,
        { accountId: ACCOUNT_ID, keyRefId: KEY_REF_ID },
      );
    });

    it('wraps the wizard with intro and outro messages', async () => {
      const { api } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      expect(clackMock.intro).toHaveBeenCalledWith('Hiero CLI Setup');
      expect(clackMock.outro).toHaveBeenCalledWith('Setup complete!');
    });

    it('offers all supported networks with testnet as default', async () => {
      const { api } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      expect(clackMock.select).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Select network',
          initialValue: SupportedNetwork.TESTNET,
          options: expect.arrayContaining([
            expect.objectContaining({ value: SupportedNetwork.TESTNET }),
            expect.objectContaining({ value: SupportedNetwork.MAINNET }),
            expect.objectContaining({ value: SupportedNetwork.PREVIEWNET }),
            expect.objectContaining({ value: SupportedNetwork.LOCALNET }),
          ]),
        }),
      );
    });

    it('offers both key managers with the encrypted one as default', async () => {
      const { api } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      expect(clackMock.select).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          initialValue: KeyManager.local_encrypted,
          options: expect.arrayContaining([
            expect.objectContaining({ value: KeyManager.local_encrypted }),
            expect.objectContaining({ value: KeyManager.local }),
          ]),
        }),
      );
    });

    it('rejects invalid account IDs and accepts valid ones in the text prompt', async () => {
      const { api } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      const validate = clackMock.text.mock.calls[0][0]
        .validate as ValidateFunction;
      expect(validate('not-an-id')).toBe(
        'Hedera entity ID must be in format 0.0.{number}',
      );
      expect(validate(ACCOUNT_ID)).toBeUndefined();
    });

    it('rejects invalid private keys and accepts valid ones in the password prompt', async () => {
      const { api } = setupApi();
      answerFirstTimePrompts();

      await ensureCliInitialized(api);

      const validate = clackMock.password.mock.calls[0][0]
        .validate as ValidateFunction;
      expect(validate('not-a-key')).toEqual(expect.any(String));
      expect(validate(PRIVATE_KEY)).toBeUndefined();
    });

    it('exits with code 0 and stores nothing when the user cancels', async () => {
      const { api, network, config } = setupApi();
      clackMock.select.mockResolvedValueOnce(CANCEL_SYMBOL);

      await expect(ensureCliInitialized(api)).rejects.toThrow('process.exit');

      expect(clackMock.cancel).toHaveBeenCalledWith('Operation cancelled.');
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(network.setOperator).not.toHaveBeenCalled();
      expect(config.setOption).not.toHaveBeenCalled();
    });

    it('exits with code 0 when the user cancels the private key prompt', async () => {
      const { api, network } = setupApi();
      clackMock.select.mockResolvedValueOnce(SupportedNetwork.TESTNET);
      clackMock.text.mockResolvedValueOnce(ACCOUNT_ID);
      clackMock.password.mockResolvedValueOnce(CANCEL_SYMBOL);

      await expect(ensureCliInitialized(api)).rejects.toThrow('process.exit');

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(network.setOperator).not.toHaveBeenCalled();
    });
  });

  describe('setup on a network without operator, when another network already has one', () => {
    it('keeps the global configuration when the user declines the override', async () => {
      const { api, network, kms, config } = setupApi({ hasAnyOperator: true });
      clackMock.text.mockResolvedValueOnce(ACCOUNT_ID);
      clackMock.password.mockResolvedValueOnce(PRIVATE_KEY);
      clackMock.confirm.mockResolvedValueOnce(false);

      await ensureCliInitialized(api);

      expect(clackMock.select).not.toHaveBeenCalled();
      expect(config.setOption).not.toHaveBeenCalled();
      expect(kms.importAndValidatePrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ED25519,
        PRIVATE_KEY,
        ACCOUNT_PUBLIC_KEY,
        KeyManager.local_encrypted,
      );
      expect(network.setOperator).toHaveBeenCalledWith(
        SupportedNetwork.TESTNET,
        { accountId: ACCOUNT_ID, keyRefId: KEY_REF_ID },
      );
      expect(clackMock.log.info).toHaveBeenCalledWith(
        'Operator saved. Global configuration unchanged.',
      );
    });

    it('asks again for global settings and stores them when the user accepts the override', async () => {
      const { api, network, kms, config } = setupApi({ hasAnyOperator: true });
      clackMock.text.mockResolvedValueOnce(ACCOUNT_ID);
      clackMock.password.mockResolvedValueOnce(PRIVATE_KEY);
      clackMock.confirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      clackMock.select.mockResolvedValueOnce(KeyManager.local);

      await ensureCliInitialized(api);

      expect(config.setOption).toHaveBeenCalledWith(
        ConfigOptionKey.ed25519_support,
        false,
      );
      expect(config.setOption).toHaveBeenCalledWith(
        ConfigOptionKey.default_key_manager,
        KeyManager.local,
      );
      expect(kms.importAndValidatePrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ED25519,
        PRIVATE_KEY,
        ACCOUNT_PUBLIC_KEY,
        KeyManager.local,
      );
      expect(network.setOperator).toHaveBeenCalledWith(
        SupportedNetwork.TESTNET,
        { accountId: ACCOUNT_ID, keyRefId: KEY_REF_ID },
      );
      expect(clackMock.log.info).not.toHaveBeenCalled();
    });
  });
});
