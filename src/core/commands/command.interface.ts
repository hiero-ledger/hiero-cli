import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Context } from '@/core/shared/context/context';

export interface Command {
  execute(args: CommandHandlerArgs, context: Context): Promise<CommandResult>;
}
