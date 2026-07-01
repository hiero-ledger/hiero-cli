import type { PaymentRequired } from '@x402/core/types';
import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { PaymentSignerService } from '@/plugins/x402/services/payment-signer.service.interface';
import type { X402SignOutput } from './output';

import { x402Client } from '@x402/core/client';
import {
  decodePaymentRequiredHeader,
  encodePaymentSignatureHeader,
} from '@x402/core/http';
import { ExactHederaScheme } from '@x402/hedera/exact/client';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { PaymentSignerServiceImpl } from '@/plugins/x402/services/payment-signer.service';
import { caip2ToSupportedNetwork } from '@/plugins/x402/utils/network';
import { selectHederaRequirement } from '@/plugins/x402/utils/select-requirement';

import { X402SignInputSchema } from './input';

const EXPECTED_X402_VERSION = 2;

export class X402SignCommand implements Command {
  constructor(private readonly paymentSigner: PaymentSignerService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = X402SignInputSchema.parse(args.args);

    api.logger.info('[x402] Signing payment challenge');

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolved = await api.keyResolver.resolveAccountCredentials(
      validArgs.from,
      keyManager,
      true,
    );

    const paymentRequired = this.decodeChallenge(validArgs.challenge);
    if (paymentRequired.x402Version !== EXPECTED_X402_VERSION) {
      throw new ValidationError(
        `Unsupported x402 protocol version ${paymentRequired.x402Version}; only version 2 is supported.`,
        { context: { x402Version: paymentRequired.x402Version } },
      );
    }
    const requirement = selectHederaRequirement(
      paymentRequired.accepts,
      validArgs.asset,
    );
    const network = caip2ToSupportedNetwork(requirement.network);

    const activeNetwork = api.network.getCurrentNetwork();
    if (activeNetwork !== network) {
      throw new ValidationError(
        `Challenge targets network ${network} but the active network is ${activeNetwork}. Switch network before signing.`,
        { context: { challengeNetwork: network, activeNetwork } },
      );
    }

    const kmsSigner = this.paymentSigner.createSigner({
      keyRefId: resolved.keyRefId,
      accountId: resolved.accountId,
      network,
    });

    const client = new x402Client().register(
      'hedera:*',
      new ExactHederaScheme(kmsSigner.signer),
    );
    const scoped: PaymentRequired = {
      ...paymentRequired,
      accepts: [requirement],
    };
    const payload = await client.createPaymentPayload(scoped);
    const paymentSignatureHeader = encodePaymentSignatureHeader(payload);

    const ctx = kmsSigner.getBuiltContext();
    const result: X402SignOutput = {
      paymentSignatureHeader,
      payer: ctx.payer,
      payTo: ctx.payTo,
      amount: ctx.amount,
      asset: ctx.asset,
      network: ctx.network,
      feePayer: ctx.feePayer,
      transactionId: ctx.transactionId,
    };

    return { result };
  }

  private decodeChallenge(challenge: string): PaymentRequired {
    try {
      return decodePaymentRequiredHeader(challenge);
    } catch (error) {
      throw new ValidationError('Invalid PAYMENT-REQUIRED header.', {
        cause: error,
      });
    }
  }
}

export async function x402Sign(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const paymentSigner = new PaymentSignerServiceImpl(
    args.api.kms,
    args.api.transfer,
  );
  return new X402SignCommand(paymentSigner).execute(args);
}
