import type { ZodSchema } from 'zod';
import type { CoreApi } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import * as clack from '@clack/prompts';

import { ConfigurationError } from '@/core/errors';
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

async function collectOperatorData() {
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

  return { accountId, privateKey, keyManager, ed25519Support };
}

async function saveOperatorConfig(
  api: CoreApi,
  accountId: string,
  privateKey: string,
  keyManager: KeyManagerName,
  ed25519Support: boolean,
) {
  api.config.setOption('ed25519_support_enabled', ed25519Support);
  api.config.setOption('default_key_manager', keyManager);

  const account = await api.mirror.getAccount(accountId);
  const { keyRefId } = api.kms.importAndValidatePrivateKey(
    account.keyAlgorithm,
    privateKey,
    account.accountPublicKey,
    keyManager,
  );

  const currentNetwork = api.network.getCurrentNetwork();
  api.network.setOperator(currentNetwork, {
    accountId,
    keyRefId,
  });
}

async function initializeCliOperator(api: CoreApi) {
  clack.intro('⚙️  No operator configured. Setting up default operator.');

  const { accountId, privateKey, keyManager, ed25519Support } =
    await collectOperatorData();

  clack.outro('Setup data collected.');

  await saveOperatorConfig(
    api,
    accountId,
    privateKey,
    keyManager,
    ed25519Support,
  );

  api.logger.info('Setup complete: operator and config verified and saved.');
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

  throw new ConfigurationError(
    'CLI operator is not configured. Use hcli network set-operator --operator <AccountAlias or AccountId:PrivateKey>',
  );
}
