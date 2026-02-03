import type { ZodSchema } from 'zod';
import type { CoreApi } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import * as clack from '@clack/prompts';

import { EntityIdSchema, PrivateKeySchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

const NETWORK_DISPLAY_OPTIONS = [
  {
    value: SupportedNetwork.TESTNET,
    label: 'Testnet (Recommended)',
  },
  {
    value: SupportedNetwork.MAINNET,
    label: 'Mainnet',
  },
  {
    value: SupportedNetwork.PREVIEWNET,
    label: 'Previewnet',
  },
  {
    value: SupportedNetwork.LOCALNET,
    label: 'Localnet',
  },
];

const KEY_MANAGER_OPTIONS = [
  {
    label: 'Local Encrypted (Recommended)',
    value: 'local_encrypted',
    hint: 'AES-256 encrypted storage',
  },
  {
    label: 'Local (unencrypted)',
    value: 'local',
    hint: 'Plain text storage',
  },
];

function ensureNotCanceled<T>(result: T | symbol): T {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
}

function clackZodValidation(
  zodSchema: ZodSchema,
): (value: unknown) => string | undefined {
  return (value: unknown) => {
    const parsed = zodSchema.safeParse(value);
    return parsed.error?.issues[0].message;
  };
}

async function promptForNetworkSelection(): Promise<SupportedNetwork> {
  const selected = await clack.select({
    message: 'Select network',
    options: NETWORK_DISPLAY_OPTIONS,
    initialValue: SupportedNetwork.TESTNET,
  });

  return ensureNotCanceled(selected);
}

async function promptForAccountCredentials(): Promise<{
  accountId: string;
  privateKey: string;
}> {
  let accountId = await clack.text({
    message: 'Enter your Account ID (e.g., 0.0.123):',
    validate: clackZodValidation(EntityIdSchema),
    placeholder: '0.0.123',
  });
  accountId = ensureNotCanceled(accountId);

  let privateKey = await clack.text({
    message: 'Enter your Private Key:',
    validate: clackZodValidation(PrivateKeySchema),
  });
  privateKey = ensureNotCanceled(privateKey);

  return { accountId, privateKey };
}

async function promptForGlobalConfig(): Promise<{
  keyManager: KeyManagerName;
  ed25519Support: boolean;
}> {
  let keyManager = (await clack.select({
    message: 'Select Key Manager:',
    options: KEY_MANAGER_OPTIONS,
    initialValue: 'local_encrypted',
  })) as KeyManagerName;
  keyManager = ensureNotCanceled(keyManager);

  let ed25519Support = await clack.confirm({
    message: 'Enable ED25519 key support?',
    initialValue: false,
  });
  ed25519Support = ensureNotCanceled(ed25519Support);

  return { keyManager, ed25519Support };
}

async function promptForOverride(): Promise<boolean> {
  let override = await clack.confirm({
    message:
      'KeyManager and ED25519 support already configured. Override global settings?',
    initialValue: false,
  });

  return ensureNotCanceled(override);
}

function saveGlobalConfiguration(
  api: CoreApi,
  keyManager: KeyManagerName,
  ed25519Support: boolean,
): void {
  api.config.setOption('ed25519_support_enabled', ed25519Support);
  api.config.setOption('default_key_manager', keyManager);
}

async function importOperatorKey(
  api: CoreApi,
  accountId: string,
  privateKey: string,
  keyManager?: KeyManagerName,
): Promise<string> {
  const account = await api.mirror.getAccount(accountId);
  const finalKeyManager =
    keyManager ?? api.config.getOption('default_key_manager');

  const { keyRefId } = api.kms.importAndValidatePrivateKey(
    account.keyAlgorithm,
    privateKey,
    account.accountPublicKey,
    finalKeyManager,
  );

  return keyRefId;
}

function setOperatorForCurrentNetwork(
  api: CoreApi,
  accountId: string,
  keyRefId: string,
): void {
  const currentNetwork = api.network.getCurrentNetwork();
  api.network.setOperator(currentNetwork, { accountId, keyRefId });
}

async function runFirstTimeSetup(api: CoreApi): Promise<void> {
  const selectedNetwork = await promptForNetworkSelection();
  api.network.switchNetwork(selectedNetwork);

  const { accountId, privateKey } = await promptForAccountCredentials();
  const { keyManager, ed25519Support } = await promptForGlobalConfig();

  saveGlobalConfiguration(api, keyManager, ed25519Support);
  const keyRefId = await importOperatorKey(
    api,
    accountId,
    privateKey,
    keyManager,
  );
  setOperatorForCurrentNetwork(api, accountId, keyRefId);
}

async function runNetworkChangeSetup(api: CoreApi): Promise<void> {
  const { accountId, privateKey } = await promptForAccountCredentials();
  const override = await promptForOverride();

  if (override) {
    const { keyManager, ed25519Support } = await promptForGlobalConfig();
    saveGlobalConfiguration(api, keyManager, ed25519Support);
    const keyRefId = await importOperatorKey(
      api,
      accountId,
      privateKey,
      keyManager,
    );
    setOperatorForCurrentNetwork(api, accountId, keyRefId);
  } else {
    const keyRefId = await importOperatorKey(api, accountId, privateKey);
    setOperatorForCurrentNetwork(api, accountId, keyRefId);
    clack.log.info('Operator saved. Global configuration unchanged.');
  }
}

async function initializeCliOperator(api: CoreApi): Promise<void> {
  clack.intro('Hiero CLI Setup');

  const isFirstTime = !api.network.hasAnyOperator();

  if (isFirstTime) {
    await runFirstTimeSetup(api);
  } else {
    await runNetworkChangeSetup(api);
  }

  clack.outro('Setup complete!');
}

/**
 * Ensures CLI has operator configured. If not, runs interactive setup wizard.
 */
export async function ensureCliInitialized(api: CoreApi) {
  const currentNetwork = api.network.getCurrentNetwork();
  const operator = api.network.getOperator(currentNetwork);

  if (operator) return;

  const output = api.output.getFormat();

  if (output === 'human') {
    await initializeCliOperator(api);
    return;
  }

  throw new Error(
    'CLI operator is not configured. Use hcli network set-operator --operator <AccountAlias or AccountId:PrivateKey>',
  );
}
