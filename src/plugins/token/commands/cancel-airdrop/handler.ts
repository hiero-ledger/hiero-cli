import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenCancelAirdropOutput } from './output';
import type {
  CancelAirdropBuildTransactionResult,
  CancelAirdropExecuteTransactionResult,
  CancelAirdropNormalizedParams,
  CancelAirdropSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TokenCancelAirdropInputSchema } from './input';

export const TOKEN_CANCEL_AIRDROP_COMMAND_NAME = 'token_cancel-airdrop';

export class TokenCancelAirdropCommand extends BaseTransactionCommand<
  CancelAirdropNormalizedParams,
  CancelAirdropBuildTransactionResult,
  CancelAirdropSignTransactionResult,
  CancelAirdropExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_CANCEL_AIRDROP_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CancelAirdropNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenCancelAirdropInputSchema.parse(args.args);
    const {
      token: tokenIdOrAlias,
      receiver,
      serial,
      from,
      keyManager: keyManagerArg,
    } = validArgs;

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);
    if (!resolvedToken?.tokenId) {
      throw new ValidationError(`Failed to resolve token: ${tokenIdOrAlias}`);
    }
    const tokenId = resolvedToken.tokenId;

    const resolvedReceiver = resolveDestinationAccountParameter(
      receiver,
      api,
      network,
    );
    if (!resolvedReceiver?.accountId) {
      throw new ValidationError(`Failed to resolve receiver: ${receiver}`);
    }
    const receiverAccountId = resolvedReceiver.accountId;

    const resolvedFrom = await api.keyResolver.resolveAccountCredentials(
      from,
      keyManager,
      true,
      ['token:account'],
    );

    if (!resolvedFrom?.accountId || !resolvedFrom?.keyRefId) {
      const fromDisplay = from?.rawValue ?? 'unknown';
      throw new ValidationError(
        `Failed to resolve sender account: ${fromDisplay}`,
      );
    }

    const { accountId: senderAccountId, keyRefId: signerKeyRefId } =
      resolvedFrom;

    logger.info(
      `Cancelling airdrop: ${tokenId}${serial !== undefined ? `#${serial}` : ''} from ${senderAccountId} to ${receiverAccountId}`,
    );

    return {
      network,
      tokenId,
      senderAccountId,
      receiverAccountId,
      serial: serial ?? null,
      signerKeyRefId,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CancelAirdropNormalizedParams,
  ): Promise<CancelAirdropBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building cancel airdrop transaction body');

    const transaction = api.token.createCancelAirdropTransaction({
      senderAccountId: normalisedParams.senderAccountId,
      receiverAccountId: normalisedParams.receiverAccountId,
      tokenId: normalisedParams.tokenId,
      ...(normalisedParams.serial !== null && {
        serial: normalisedParams.serial,
      }),
    });

    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CancelAirdropNormalizedParams,
    buildTransactionResult: CancelAirdropBuildTransactionResult,
  ): Promise<CancelAirdropSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(`Using key ${normalisedParams.signerKeyRefId} for signing`);

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.signerKeyRefId],
    );

    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CancelAirdropNormalizedParams,
    _buildTransactionResult: CancelAirdropBuildTransactionResult,
    signTransactionResult: CancelAirdropSignTransactionResult,
  ): Promise<CancelAirdropExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Cancel airdrop failed (tokenId: ${normalisedParams.tokenId}, from: ${normalisedParams.senderAccountId}, to: ${normalisedParams.receiverAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: CancelAirdropNormalizedParams,
    _buildTransactionResult: CancelAirdropBuildTransactionResult,
    _signTransactionResult: CancelAirdropSignTransactionResult,
    executeTransactionResult: CancelAirdropExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenCancelAirdropOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      sender: normalisedParams.senderAccountId,
      receiver: normalisedParams.receiverAccountId,
      serial: normalisedParams.serial,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenCancelAirdrop(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenCancelAirdropCommand().execute(args);
}
