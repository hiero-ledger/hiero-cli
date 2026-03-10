import type { CommandHandlerArgs, CommandResult } from '@/core';

export interface Command {
  execute(args: CommandHandlerArgs): Promise<CommandResult>;
}
