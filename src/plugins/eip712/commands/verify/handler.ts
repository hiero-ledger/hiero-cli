import type {
  CommandHandlerArgs,
  CommandResult,
  IdentityResolutionService,
  SupportedNetwork,
} from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { Eip712VerifyOutput } from './output';

import { verifyTypedData } from 'ethers';

import { EntityReferenceType } from '@/core';
import { ValidationError } from '@/core/errors';

import { Eip712VerifyInputSchema } from './input';

export class Eip712VerifyCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712VerifyInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const domain = validArgs.domain.value;
    const types = validArgs.types.value;
    const message = validArgs.message.value;
    const signature = validArgs.signature;
    const expectedSigner = validArgs.expectedSigner;

    const recoveredSigner = verifyTypedData(domain, types, message, signature);
    const output: Eip712VerifyOutput = { recoveredSigner };

    if (expectedSigner) {
      const expectedSignerEvmAddress = await this.resolveExpectedSigner(
        expectedSigner,
        api.identityResolution,
        network,
      );
      output.match =
        recoveredSigner.toLowerCase().trim() ===
        expectedSignerEvmAddress.toLowerCase().trim();
    }

    return { result: output };
  }

  private async resolveExpectedSigner(
    expectedSigner: {
      value: string;
      type: EntityReferenceType;
    },
    identityResolutionService: IdentityResolutionService,
    network: SupportedNetwork,
  ): Promise<string> {
    if (expectedSigner.type === EntityReferenceType.EVM_ADDRESS) {
      return expectedSigner.value;
    }
    const expectedSignerAccount =
      await identityResolutionService.resolveAccount({
        accountReference: expectedSigner.value,
        type: expectedSigner.type,
        network,
      });
    if (!expectedSignerAccount.evmAddress) {
      throw new ValidationError(
        `Could not resolve evm address for expected signer parameter ${expectedSigner.value}`,
      );
    }
    return expectedSignerAccount.evmAddress;
  }
}

export async function eip712Verify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712VerifyCommand().execute(args);
}
