import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenAirdropNftOutput } from './output';
import type {
  AirdropNftRecipient,
  TokenAirdropNftBuildTransactionResult,
  TokenAirdropNftExecuteTransactionResult,
  TokenAirdropNftNormalizedParams,
  TokenAirdropNftSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import { TokenAirdropNftInputSchema } from './input';

export const TOKEN_AIRDROP_NFT_COMMAND_NAME = 'token_airdrop-nft';

const MAX_NFT_AIRDROP_SERIALS = 20;

export class TokenAirdropNftCommand extends BaseTransactionCommand<
  TokenAirdropNftNormalizedParams,
  TokenAirdropNftBuildTransactionResult,
  TokenAirdropNftSignTransactionResult,
  TokenAirdropNftExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_AIRDROP_NFT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenAirdropNftNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenAirdropNftInputSchema.parse(args.args);

    const {
      token: tokenIdOrAlias,
      from,
      serials,
      to: toList,
      keyManager: keyManagerArg,
    } = validArgs;

    const totalSerials = serials.flat().length;
    if (totalSerials > MAX_NFT_AIRDROP_SERIALS) {
      throw new ValidationError(
        `Too many serials: ${totalSerials}. Maximum allowed is ${MAX_NFT_AIRDROP_SERIALS} per transaction.`,
      );
    }

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);
    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
        context: { tokenIdOrAlias },
      });
    }

    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    if (tokenInfo.type !== MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE) {
      throw new ValidationError('Token is not an NFT', {
        context: { tokenId, type: tokenInfo.type },
      });
    }

    const recipients: AirdropNftRecipient[] = [];
    for (let i = 0; i < toList.length; i++) {
      const recipientInput = toList[i];
      const recipientSerials = serials[i];

      const resolvedAccount = resolveDestinationAccountParameter(
        recipientInput,
        api,
        network,
      );

      if (!resolvedAccount) {
        throw new NotFoundError(
          `Destination account not found: ${recipientInput}`,
          {
            context: { account: recipientInput },
          },
        );
      }

      recipients.push({
        accountId: resolvedAccount.accountId,
        serialNumbers: recipientSerials,
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
      `Airdropping NFT ${tokenId} to ${recipients.length} recipient(s)`,
    );

    return {
      network,
      tokenId,
      fromAccountId,
      recipients,
      signerKeyRefId,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAirdropNftNormalizedParams,
  ): Promise<TokenAirdropNftBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building NFT airdrop transaction body');
    const transaction = api.token.createAirdropNftTransaction({
      tokenId: normalisedParams.tokenId,
      senderAccountId: normalisedParams.fromAccountId,
      transfers: normalisedParams.recipients.map((r) => ({
        recipientAccountId: r.accountId,
        serialNumbers: r.serialNumbers,
      })),
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenAirdropNftNormalizedParams,
    buildTransactionResult: TokenAirdropNftBuildTransactionResult,
  ): Promise<TokenAirdropNftSignTransactionResult> {
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
    normalisedParams: TokenAirdropNftNormalizedParams,
    _buildTransactionResult: TokenAirdropNftBuildTransactionResult,
    signTransactionResult: TokenAirdropNftSignTransactionResult,
  ): Promise<TokenAirdropNftExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `NFT airdrop failed (tokenId: ${normalisedParams.tokenId}, from: ${normalisedParams.fromAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenAirdropNftNormalizedParams,
    _buildTransactionResult: TokenAirdropNftBuildTransactionResult,
    _signTransactionResult: TokenAirdropNftSignTransactionResult,
    executeTransactionResult: TokenAirdropNftExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenAirdropNftOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      from: normalisedParams.fromAccountId,
      recipients: normalisedParams.recipients.map((r) => ({
        to: r.accountId,
        serials: r.serialNumbers,
      })),
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenAirdropNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAirdropNftCommand().execute(args);
}
