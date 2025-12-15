import type { PromptService, SetupData } from './prompt-service.interface';

import * as clack from '@clack/prompts';

export class PromptServiceImpl implements PromptService {
  constructor() {}

  async collectSetupData(): Promise<SetupData> {
    clack.intro('⚙️  No operator configured. Setting up default operator.');

    const accountId = await clack.text({
      message: 'Enter your Account ID (e.g., 0.0.123):',
      placeholder: '0.0.123',
    });
    this.handleCancel(accountId);

    const privateKey = await clack.password({
      message: 'Enter your Private Key:',
    });
    this.handleCancel(privateKey);

    const keyManager = await clack.select({
      message: 'Select Key Manager:',
      options: [
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
      ],
      initialValue: 'local_encrypted',
    });
    this.handleCancel(keyManager);

    clack.outro('Setup data collected.');

    return {
      accountId: accountId as string,
      privateKey: privateKey as string,
      keyManager: keyManager as 'local' | 'local_encrypted',
    };
  }

  async confirm(
    title: string,
    data?: Record<string, string | number>,
  ): Promise<boolean> {
    const lines = Object.entries(data || {}).map(
      ([key, value]) => `${key.padEnd(12)} ${value}`,
    );

    if (lines.length > 0) {
      clack.note(lines.join('\n'), title);
    }

    const result = await clack.confirm({
      message: 'Confirm?',
      initialValue: false,
    });

    this.handleCancel(result);
    return result as boolean;
  }

  private handleCancel(result: unknown): void {
    if (clack.isCancel(result)) {
      clack.cancel('Operation cancelled.');
      process.exit(0);
    }
  }
}
