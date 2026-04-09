import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduleCreateOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import { ScheduleCreateInputSchema } from './input';

export class ScheduleCreateCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const scheduleState = new ZustandScheduleStateHelper(api.state, logger);
    const validArgs = ScheduleCreateInputSchema.parse(args.args);
    const name = validArgs.name;
    const network = api.network.getCurrentNetwork();
    const expirationTime = validArgs.expiration;
    const waitForExpiry = validArgs.waitForExpiry;
    const memo = validArgs.memo;
    const adminKey = validArgs.adminKey;
    const payer = validArgs.payerAccount;
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const scheduleKey = composeKey(network, name);

    if (scheduleState.hasScheduled(scheduleKey)) {
      throw new ValidationError(
        `Schedule with name '${name}' already exists on this network`,
      );
    }
    let payerCredential: ResolvedAccountCredential | undefined;
    if (payer) {
      payerCredential = await api.keyResolver.resolveAccountCredentials(
        payer,
        keyManager,
        true,
      );
    }

    let admin: ResolvedPublicKey | undefined;
    if (adminKey) {
      admin = await api.keyResolver.resolveSigningKey(
        adminKey,
        keyManager,
        false,
        ['schedule:admin'],
      );
    }

    scheduleState.saveScheduled(scheduleKey, {
      name,
      network,
      keyManager,
      adminKeyRefId: admin?.keyRefId,
      adminPublicKey: admin?.publicKey,
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
      adminPublicKey: admin?.publicKey,
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
  return new ScheduleCreateCommand().execute(args);
}
