import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduleKeysService } from '@/plugins/schedule/services/schedule-keys.service.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type { ScheduleCreateOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ScheduleKeysServiceImpl } from '@/plugins/schedule/services/schedule-keys.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';

import { ScheduleCreateInputSchema } from './input';

export class ScheduleCreateCommand implements Command {
  constructor(
    private readonly scheduleState: ScheduleStateService,
    private readonly scheduleKeys: ScheduleKeysService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ScheduleCreateInputSchema.parse(args.args);
    const name = validArgs.name;
    const network = api.network.getCurrentNetwork();
    const expirationTime = validArgs.expiration;
    const waitForExpiry = validArgs.waitForExpiry;
    const memo = validArgs.memo;
    const adminKey = validArgs.adminKey ?? [];
    const payer = validArgs.payerAccount;
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const scheduleKey = composeKey(network, name);

    if (this.scheduleState.hasScheduled(scheduleKey)) {
      throw new ValidationError(
        `Schedule with name '${name}' already exists on this network`,
      );
    }
    const payerCredential = await this.scheduleKeys.resolveCreatePayer(
      payer,
      keyManager,
    );
    const adminKeys = await this.scheduleKeys.resolveCreateAdminKeys(
      adminKey,
      keyManager,
    );

    this.scheduleState.saveScheduled(scheduleKey, {
      name,
      network,
      keyManager,
      adminKeyRefIds: adminKeys.map((k) => k.keyRefId),
      adminPublicKeys: adminKeys.map((k) => k.publicKey),
      adminKeyThreshold: validArgs.adminKeyThreshold,
      payerAccountId: payerCredential?.accountId,
      payerKeyRefId: payerCredential?.keyRefId,
      memo,
      expirationTime: expirationTime?.toISOString(),
      waitForExpiry,
      scheduled: false,
      executed: false,
      createdAt: new Date().toISOString(),
    });

    const outputData: ScheduleCreateOutput = {
      name,
      network,
      payerAccountId: payerCredential?.accountId,
      adminKeyPresent: adminKeys.length > 0,
      adminKeyCount: adminKeys.length > 0 ? adminKeys.length : undefined,
      adminKeyThreshold: validArgs.adminKeyThreshold,
      memo,
      expirationTime: expirationTime?.toISOString(),
      waitForExpiry,
    };

    return { result: outputData };
  }
}

export async function scheduleCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const scheduleState = new ScheduleStateServiceImpl(api.state, api.logger);
  const scheduleKeys = new ScheduleKeysServiceImpl(api.keyResolver, api.mirror);

  return new ScheduleCreateCommand(scheduleState, scheduleKeys).execute(args);
}
