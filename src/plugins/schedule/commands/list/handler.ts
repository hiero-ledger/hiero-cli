import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type { ScheduleListOutput } from './output';

import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';

export class ScheduleListCommand implements Command {
  constructor(private readonly scheduleState: ScheduleStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const network = api.network.getCurrentNetwork();

    const schedules = this.scheduleState.listScheduled().map((s) => ({
      name: s.name,
      network: s.network,
      scheduled: s.scheduled,
      executed: s.executed,
      waitForExpiry: s.waitForExpiry,
      expirationTime: s.expirationTime,
      createdAt: s.createdAt,
    }));

    const outputData: ScheduleListOutput = {
      network,
      schedules,
      total: schedules.length,
    };

    return { result: outputData };
  }
}

export async function scheduleList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const scheduleState = new ScheduleStateServiceImpl(api.state, api.logger);

  return new ScheduleListCommand(scheduleState).execute(args);
}
