import type {
  CommandHandlerArgs,
  CommandResult,
  IdentityResolutionService,
  SupportedNetwork,
} from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ExpectedSignerType } from '@/plugins/eip712/commands/verify-ecdsa/types';
import type { Eip712VerifyEcdsaOutput } from './output';

import { recoverAddress } from 'ethers';

import { EntityReferenceType } from '@/core';
import { ValidationError } from '@/core/errors';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712VerifyEcdsaInputSchema } from './input';

export class Eip712VerifyEcdsaCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712VerifyEcdsaInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();
    const signature = validArgs.signature;
    const expectedSigner = validArgs.expectedSigner;
    const hash = resolveHash(
      validArgs.hash,
      validArgs.domain?.value,
      validArgs.types?.value,
      validArgs.message?.value,
    );
    const recoveredSigner = recoverAddress(hash, signature);
    const output: Eip712VerifyEcdsaOutput = { recoveredSigner };

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
    expectedSigner: ExpectedSignerType,
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

export async function eip712VerifyEcdsa(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712VerifyEcdsaCommand().execute(args);
}
