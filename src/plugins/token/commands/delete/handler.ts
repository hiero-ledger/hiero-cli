import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  KeyManager,
  KmsCredentialRecord,
} from '@/core/services/kms/kms-types.interface';
import type { TokenDeleteInput } from './input';
import type { TokenDeleteOutput } from './output';
import type {
  TokenDeleteBuildTransactionResult,
  TokenDeleteExecuteTransactionResult,
  TokenDeleteNormalizedParams,
  TokenDeleteSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenDeleteInputSchema } from './input';

export const TOKEN_DELETE_COMMAND_NAME = 'token_delete';

export class TokenDeleteCommand extends BaseTransactionCommand<
  TokenDeleteNormalizedParams,
  TokenDeleteBuildTransactionResult,
  TokenDeleteSignTransactionResult,
  TokenDeleteExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_DELETE_COMMAND_NAME);
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = TokenDeleteInputSchema.parse(args.args);
    if (validArgs.stateOnly) {
      return this.executeStateOnlyDelete(args, validArgs);
    }
    return super.execute(args);
  }

  private async executeStateOnlyDelete(
    args: CommandHandlerArgs,
    validArgs: TokenDeleteInput,
  ): Promise<CommandResult> {
    const { api, logger } = args;

    if (validArgs.adminKey) {
      throw new ValidationError(
        '--state-only and --admin-key are mutually exclusive',
      );
    }

    const network = api.network.getCurrentNetwork();
    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    const tokenId = resolvedToken!.tokenId;
    const key = composeKey(network, tokenId);

    const tokenInState = tokenState.getToken(key);
    if (!tokenInState) {
      throw new NotFoundError('Token not found in state', {
        context: { token: validArgs.token },
      });
    }

    const aliasesForToken = api.alias
      .list({ network, type: AliasType.Token })
      .filter((rec) => rec.entityId === tokenId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForToken) {
      api.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
    }

    tokenState.removeToken(key);

    const outputData: TokenDeleteOutput = {
      deletedToken: {
        name: tokenInState.name,
        tokenId: tokenInState.tokenId,
      },
      network,
    };

    if (removedAliases.length > 0) {
      outputData.removedAliases = removedAliases;
    }

    return { result: outputData };
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenDeleteNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenDeleteInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    const tokenId = resolvedToken!.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    if (!tokenInfo.admin_key) {
      throw new ValidationError(
        'Token has no admin key (immutable token cannot be deleted)',
        { context: { tokenId } },
      );
    }

    const adminKeyResolved = await this.resolveAdminKey(
      api,
      validArgs,
      keyManager,
      tokenInfo.admin_key.key,
      tokenId,
    );

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const key = composeKey(network, tokenId);
    const tokenInState = tokenState.getToken(key);
    const tokenName = tokenInState?.name ?? tokenInfo.name;

    return { network, tokenId, tokenName, adminKeyResolved };
  }

  private async resolveAdminKey(
    api: CommandHandlerArgs['api'],
    validArgs: TokenDeleteInput,
    keyManager: KeyManager,
    tokenAdminPublicKey: string,
    tokenId: string,
  ): Promise<ResolvedPublicKey> {
    if (validArgs.adminKey) {
      const adminKeyResolved = await api.keyResolver.resolveSigningKey(
        validArgs.adminKey,
        keyManager,
        false,
        ['token:admin'],
      );
      if (tokenAdminPublicKey !== adminKeyResolved.publicKey) {
        throw new ValidationError('Admin key mismatch', {
          context: { tokenId },
        });
      }
      return adminKeyResolved;
    }

    const kmsRecord: KmsCredentialRecord | undefined =
      api.kms.findByPublicKey(tokenAdminPublicKey);
    if (!kmsRecord) {
      throw new ValidationError(
        'Admin key not found in key manager. Provide --admin-key.',
        { context: { tokenId } },
      );
    }
    return { keyRefId: kmsRecord.keyRefId, publicKey: kmsRecord.publicKey };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenDeleteNormalizedParams,
  ): Promise<TokenDeleteBuildTransactionResult> {
    const { logger } = args;
    logger.debug('Building token delete transaction');
    const transaction = args.api.token.createDeleteTransaction({
      tokenId: normalisedParams.tokenId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenDeleteNormalizedParams,
    buildTransactionResult: TokenDeleteBuildTransactionResult,
  ): Promise<TokenDeleteSignTransactionResult> {
    const { api, logger } = args;
    const adminKeyRefId = normalisedParams.adminKeyResolved.keyRefId;
    logger.debug(`Using key ${adminKeyRefId} for signing transaction`);
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [adminKeyRefId],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenDeleteNormalizedParams,
    _buildTransactionResult: TokenDeleteBuildTransactionResult,
    signTransactionResult: TokenDeleteSignTransactionResult,
  ): Promise<TokenDeleteExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Token delete failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return { transactionResult: result };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TokenDeleteNormalizedParams,
    _buildTransactionResult: TokenDeleteBuildTransactionResult,
    _signTransactionResult: TokenDeleteSignTransactionResult,
    executeTransactionResult: TokenDeleteExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const { network, tokenId, tokenName } = normalisedParams;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const key = composeKey(network, tokenId);
    const tokenInState = tokenState.getToken(key);

    const removedAliases: string[] = [];

    if (tokenInState) {
      const aliasesForToken = api.alias
        .list({ network, type: AliasType.Token })
        .filter((rec) => rec.entityId === tokenId);

      for (const rec of aliasesForToken) {
        api.alias.remove(rec.alias, network);
        removedAliases.push(`${rec.alias} (${network})`);
      }

      tokenState.removeToken(key);
    }

    const outputData: TokenDeleteOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      deletedToken: { name: tokenName, tokenId },
      network,
    };

    if (removedAliases.length > 0) {
      outputData.removedAliases = removedAliases;
    }

    return { result: outputData };
  }
}

export async function tokenDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenDeleteCommand().execute(args);
}
