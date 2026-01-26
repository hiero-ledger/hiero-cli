import type { ZodSchema } from 'zod';
import type { CoreApi } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

import * as clack from '@clack/prompts';

import { EntityIdSchema, PrivateKeySchema } from '@/core/schemas';

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

function handleCancel(result: unknown): void {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.');
    process.exit(0);
  }
}

function clackZodValidation(
  zodSchema: ZodSchema,
): (value: unknown) => string | undefined {
  return (value: unknown) => {
    const parsed = zodSchema.safeParse(value);
    return parsed.error?.issues[0].message;
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function selectNetwork(api: CoreApi): Promise<SupportedNetwork> {
  const networks = api.network.getAvailableNetworks();
  const selected = await clack.select({
    message: 'Select network',
    options: networks.map((n) => ({
      label: n === 'testnet' ? 'Testnet (Recommended)' : capitalize(n),
      value: n,
    })),
    initialValue: 'testnet',
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Setup cancelled.');
    process.exit(0);
  }

  api.network.switchNetwork(selected as SupportedNetwork);
  return selected as SupportedNetwork;
}

async function collectAccountCredentials() {
  const accountId = (await clack.text({
    message: 'Enter your Account ID (e.g., 0.0.123):',
    validate: clackZodValidation(EntityIdSchema),
    placeholder: '0.0.123',
  })) as string;
  handleCancel(accountId);

  const privateKey = (await clack.text({
    message: 'Enter your Private Key:',
    validate: clackZodValidation(PrivateKeySchema),
  })) as string;
  handleCancel(privateKey);

  return { accountId, privateKey };
}

async function collectGlobalConfig() {
  const keyManager = (await clack.select({
    message: 'Select Key Manager:',
    options: KEY_MANAGER_OPTIONS,
    initialValue: 'local_encrypted',
  })) as KeyManagerName;
  handleCancel(keyManager);

  const ed25519Support = (await clack.confirm({
    message: 'Enable ED25519 key support?',
    initialValue: false,
  })) as boolean;
  handleCancel(ed25519Support);

  return { keyManager, ed25519Support };
}

async function saveOperatorConfig(
  api: CoreApi,
  config: {
    accountId: string;
    privateKey: string;
    keyManager?: KeyManagerName;
    ed25519Support?: boolean;
    saveGlobalConfig: boolean;
  },
) {
  if (config.saveGlobalConfig && config.ed25519Support !== undefined) {
    api.config.setOption('ed25519_support_enabled', config.ed25519Support);
  }

  if (config.saveGlobalConfig && config.keyManager) {
    api.config.setOption('default_key_manager', config.keyManager);
  }

  const account = await api.mirror.getAccount(config.accountId);
  const keyManager =
    config.keyManager || api.config.getOption('default_key_manager');
  const { keyRefId } = api.kms.importAndValidatePrivateKey(
    account.keyAlgorithm,
    config.privateKey,
    account.accountPublicKey,
    keyManager,
  );

  const currentNetwork = api.network.getCurrentNetwork();
  api.network.setOperator(currentNetwork, {
    accountId: config.accountId,
    keyRefId,
  });
}

async function initializeCliOperator(api: CoreApi): Promise<void> {
  clack.intro('Hiero CLI Setup');

  const isFirstTime = !api.network.hasAnyOperator();

  if (isFirstTime) {
    await selectNetwork(api);
    const credentials = await collectAccountCredentials();
    const globalConfig = await collectGlobalConfig();
    await saveOperatorConfig(api, {
      ...credentials,
      ...globalConfig,
      saveGlobalConfig: true,
    });
  } else {
    const credentials = await collectAccountCredentials();

    const override = await clack.confirm({
      message:
        'KeyManager and ED25519 support already configured. Override global settings?',
      initialValue: false,
    });

    if (clack.isCancel(override)) {
      clack.cancel('Setup cancelled.');
      process.exit(0);
    }

    if (override) {
      const globalConfig = await collectGlobalConfig();
      await saveOperatorConfig(api, {
        ...credentials,
        ...globalConfig,
        saveGlobalConfig: true,
      });
    } else {
      await saveOperatorConfig(api, {
        ...credentials,
        saveGlobalConfig: false,
      });
      clack.log.info('Operator saved. Global configuration unchanged.');
    }
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
