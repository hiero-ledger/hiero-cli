import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { FaucetPortalApiService } from '@/plugins/faucet/services/faucet-portal-api.service.interface';
import type { FaucetRequestOutput } from './output';

import { ConfigurationError } from '@/core/errors/configuration-error';
import { ValidationError } from '@/core/errors/validation-error';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { PAT_DOCS_URL } from '@/plugins/faucet/constants';
import { FaucetPortalApiServiceImpl } from '@/plugins/faucet/services/faucet-portal-api.service';

import { FaucetRequestInputSchema } from './input';

export class FaucetRequestCommand implements Command {
  constructor(private readonly portalApi: FaucetPortalApiService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = FaucetRequestInputSchema.parse(args.args);

    const pat = api.config.getOption<string>(ConfigOptionKey.portal_pat);
    if (!pat) {
      throw new ConfigurationError(
        `Hedera Portal PAT is not configured.\nTo set it up, visit: ${PAT_DOCS_URL}\nThen run: hcli config set --portal_pat <your-token>`,
      );
    }

    const network = api.network.getCurrentNetwork();
    if (
      network !== SupportedNetwork.TESTNET &&
      network !== SupportedNetwork.PREVIEWNET
    ) {
      throw new ValidationError(
        `Faucet is only available on testnet and previewnet. Current network: ${network}`,
      );
    }

    const { entityIdOrEvmAddress: resolvedRecipient } =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.recipient.value,
        referenceType: validArgs.recipient.type,
        network,
        aliasType: AliasType.Account,
      });

    const data = await this.portalApi.requestFunds({
      pat,
      address: resolvedRecipient,
      amount: validArgs.amount,
      network,
    });

    const output: FaucetRequestOutput = {
      recipient: resolvedRecipient,
      amount: data.amount,
      transactionId: data.transactionId,
      network,
      quotaUsed: data.dailyQuota.used,
      quotaRemaining: data.dailyQuota.remaining,
    };

    return { result: output };
  }
}

export async function faucetRequest(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const portalApi = new FaucetPortalApiServiceImpl();
  return new FaucetRequestCommand(portalApi).execute(args);
}
