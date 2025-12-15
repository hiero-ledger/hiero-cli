import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PromptService } from '@/core/services/prompt/prompt-service.interface';
import type { SetupService } from './setup-service.interface';

export class SetupServiceImpl implements SetupService {
  constructor(
    private readonly network: NetworkService,
    private readonly output: OutputService,
    private readonly prompt: PromptService,
  ) {}

  needsSetup(): boolean {
    const currentNetwork = this.network.getCurrentNetwork();
    const operator = this.network.getOperator(currentNetwork);
    return operator === null;
  }

  async runInitialSetup(): Promise<void> {
    // Guard: script mode
    if (this.output.getFormat() === 'json') {
      throw new Error(
        'No operator configured. In JSON mode, configure operator manually:\n' +
          '  hiero network set-operator --account-id <ID> --key-ref-id <REF>\n' +
          'Or run in interactive mode without --format json',
      );
    }

    const setupData = await this.prompt.collectSetupData();
    const currentNetwork = this.network.getCurrentNetwork();

    // Display collected data (persistence will be implemented later)
    console.log('\n✅ Setup data collected:');
    console.log(`   Account ID:   ${setupData.accountId}`);
    console.log(`   Key Manager:  ${setupData.keyManager}`);
    console.log(`   Network:      ${currentNetwork}`);
    console.log(`   Private Key:  [REDACTED]`);
    console.log(
      '\n⚠️  Persistence will be implemented in the next iteration.\n',
    );
  }
}
