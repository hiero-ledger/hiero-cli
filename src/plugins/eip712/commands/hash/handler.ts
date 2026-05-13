import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { Eip712HashOutput } from './output';

import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712HashInputSchema } from './input';

export class Eip712HashCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = Eip712HashInputSchema.parse(args.args);

    const hash = resolveHash(
      undefined,
      validArgs.domain.value,
      validArgs.types.value,
      validArgs.message.value,
    );

    const output: Eip712HashOutput = { hash };

    return { result: output };
  }
}

export async function eip712Hash(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712HashCommand().execute(args);
}
