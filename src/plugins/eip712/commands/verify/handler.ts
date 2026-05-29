import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Eip712VerificationService } from '@/plugins/eip712/services/eip712-verification.service.interface';

import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { Eip712VerificationServiceImpl } from '@/plugins/eip712/services/eip712-verification.service';
import { isEcdsaSignature } from '@/plugins/eip712/util/detect-signature-algorithm';
import { resolveEip712DataContents } from '@/plugins/eip712/util/resolve-eip712-data-contents';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712VerifyInputSchema } from './input';

export class Eip712VerifyCommand implements Command {
  constructor(private readonly verification: Eip712VerificationService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712VerifyInputSchema.parse(args.args);

    const { domain, types, message } = resolveEip712DataContents(validArgs);
    const hash = resolveHash(validArgs.hash, domain, types, message);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    if (isEcdsaSignature(validArgs.signature)) {
      const output = await this.verification.verifyEcdsa({
        signature: validArgs.signature,
        hash,
        expectedSigner: validArgs.expectedSigner,
        network: api.network.getCurrentNetwork(),
      });
      return { result: output };
    }

    const output = await this.verification.verifyEd25519({
      keyManager,
      credential: validArgs.key,
      signature: validArgs.signature,
      hash,
    });
    return { result: output };
  }
}

export async function eip712Verify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const verification = new Eip712VerificationServiceImpl(
    api.identityResolution,
    api.keyResolver,
    api.kms,
  );
  return new Eip712VerifyCommand(verification).execute(args);
}
