import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenAirdropFtOutput } from './output';
import type {
  AirdropFtRecipient,
  TokenAirdropFtBuildTransactionResult,
  TokenAirdropFtExecuteTransactionResult,
  TokenAirdropFtNormalizedParams,
  TokenAirdropFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenAirdropFtInputSchema } from './input';

export const TOKEN_AIRDROP_FT_COMMAND_NAME = 'token_airdrop-ft';

const MAX_AIRDROP_RECIPIENTS = 9;

export class TokenAirdropFtCommand extends BaseTransactionCommand<
  TokenAirdropFtNormalizedParams,
  TokenAirdropFtBuildTransactionResult,
  TokenAirdropFtSignTransactionResult,
  TokenAirdropFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_AIRDROP_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenAirdropFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const validArgs = TokenAirdropFtInputSchema.parse(args.args);

    const {
      token: tokenIdOrAlias,
      from,
      amount: amounts,
      to: recipients,
      keyManager: keyManagerArg,
    } = validArgs;

    if (recipients.length > MAX_AIRDROP_RECIPIENTS) {
      throw new ValidationError(
        `Too many recipients: ${recipients.length}. Maximum allowed is ${MAX_AIRDROP_RECIPIENTS} per transaction.`,
      );
    }

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);
    const tokenId = resolvedToken!.tokenId;

    const needsDecimals = amounts.some((a) => !isRawUnits(a));
    let tokenDecimals = 0;
    if (needsDecimals) {
      const tokenInfoStorage = tokenState.getToken(tokenId);
      if (tokenInfoStorage) {
        tokenDecimals = tokenInfoStorage.decimals;
      } else {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }
    }

    const resolvedRecipients: AirdropFtRecipient[] = [];
    for (let i = 0; i < recipients.length; i++) {
      const recipientInput = recipients[i];
      const amountInput = amounts[i];

      const resolvedAccount = resolveDestinationAccountParameter(
        recipientInput,
        api,
        network,
      );
      const rawAmount = processTokenBalanceInput(amountInput, tokenDecimals);
      resolvedRecipients.push({
        accountId: resolvedAccount!.accountId,
        rawAmount,
      });
    }

    const resolvedFromAccount = await api.keyResolver.resolveAccountCredentials(
      from,
      keyManager,
      true,
      ['token:account'],
    );

    const { accountId: fromAccountId, keyRefId: signerKeyRefId } =
      resolvedFromAccount;

    logger.info(`🔑 Using from account: ${fromAccountId}`);
    logger.info(
      `Airdropping ${tokenId} to ${resolvedRecipients.length} recipient(s)`,
    );

    return {
      network,
      tokenId,
      fromAccountId,
      recipients: resolvedRecipients,
      signerKeyRefId,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAirdropFtNormalizedParams,
  ): Promise<TokenAirdropFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building airdrop transaction body');

    const transaction = api.token.createAirdropFtTransaction({
      tokenId: normalisedParams.tokenId,
      senderAccountId: normalisedParams.fromAccountId,
      transfers: normalisedParams.recipients.map((r) => ({
        recipientAccountId: r.accountId,
        amount: r.rawAmount,
      })),
    });

    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAirdropFtNormalizedParams,
    buildTransactionResult: TokenAirdropFtBuildTransactionResult,
  ): Promise<TokenAirdropFtSignTransactionResult> {
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
    normalisedParams: TokenAirdropFtNormalizedParams,
    _buildTransactionResult: TokenAirdropFtBuildTransactionResult,
    signTransactionResult: TokenAirdropFtSignTransactionResult,
  ): Promise<TokenAirdropFtExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Fungible token airdrop failed (tokenId: ${normalisedParams.tokenId}, from: ${normalisedParams.fromAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenAirdropFtNormalizedParams,
    _buildTransactionResult: TokenAirdropFtBuildTransactionResult,
    _signTransactionResult: TokenAirdropFtSignTransactionResult,
    executeTransactionResult: TokenAirdropFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenAirdropFtOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      from: normalisedParams.fromAccountId,
      recipients: normalisedParams.recipients.map((r) => ({
        to: r.accountId,
        amount: r.rawAmount,
      })),
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenAirdropFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAirdropFtCommand().execute(args);
}
