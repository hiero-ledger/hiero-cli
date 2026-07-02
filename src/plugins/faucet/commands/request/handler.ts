import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { FaucetRequestOutput } from './output';
import type { FaucetApiResponse } from './types';

import { AuthorizationError } from '@/core/errors/authorization-error';
import { ConfigurationError } from '@/core/errors/configuration-error';
import { NetworkError } from '@/core/errors/network-error';
import { ValidationError } from '@/core/errors/validation-error';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { FAUCET_API_URL, PAT_DOCS_URL } from '@/plugins/faucet/constants';

import { FaucetRequestInputSchema } from './input';

export class FaucetRequestCommand implements Command {
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

    const response = await fetch(FAUCET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({
        address: resolvedRecipient,
        amount: validArgs.amount,
        network,
      }),
    });

    if (!response.ok) {
      await handleFaucetErrorResponse(response, resolvedRecipient, network);
    }

    const data = (await response.json()) as FaucetApiResponse;

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

async function handleFaucetErrorResponse(
  response: Response,
  recipient: string,
  network: string,
): Promise<never> {
  const body = await response.json().catch(() => ({ message: undefined }));
  const message = (body as { message?: string }).message;

  if (response.status === 403) {
    throw new AuthorizationError(
      `PAT authentication failed. Verify your token is valid.\nTo generate a new PAT, visit: ${PAT_DOCS_URL}`,
    );
  }

  if (response.status === 422) {
    throw new ValidationError(
      `Recipient ${recipient} is not fundable. Ensure the account exists on ${network}.`,
    );
  }

  if (response.status === 429) {
    throw new NetworkError(
      `Daily faucet quota exhausted. You can request up to 100 HBAR per 24 hours.`,
      { recoverable: false },
    );
  }

  throw new NetworkError(
    `Faucet API error (${response.status})${message ? `: ${message}` : ''}`,
  );
}

export async function faucetRequest(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new FaucetRequestCommand().execute(args);
}
