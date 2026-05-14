import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenReferenceService } from '@/plugins/token/services/token-reference.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';
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
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { TokenDeleteInputSchema } from './input';

export const TOKEN_DELETE_COMMAND_NAME = 'token_delete';

export class TokenDeleteCommand extends BaseTransactionCommand<
  TokenDeleteNormalizedParams,
  TokenDeleteBuildTransactionResult,
  TokenDeleteSignTransactionResult,
  TokenDeleteExecuteTransactionResult
> {
  constructor(
    private readonly tokenReferenceService: TokenReferenceService,
    private readonly tokenStateService: TokenStateService,
  ) {
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
    const { api } = args;

    if (validArgs.adminKey.length > 0) {
      throw new ValidationError(
        '--state-only and --admin-key are mutually exclusive',
      );
    }

    const network = api.network.getCurrentNetwork();

    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;
    const key = composeKey(network, tokenId);

    const tokenInState = this.tokenStateService.getToken(key);
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

    this.tokenStateService.removeToken(key);

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
    const { api } = args;

    const validArgs = TokenDeleteInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = this.tokenReferenceService.resolveToken(
      validArgs.token,
      network,
    );
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    const stateKey = composeKey(network, tokenId);
    const tokenInState = this.tokenStateService.getToken(stateKey);

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.admin_key,
      explicitCredentials: validArgs.adminKey,
      keyManager,
      signingKeyLabels: ['token:admin'],
      emptyMirrorRoleKeyMessage:
        'Token has no admin key (immutable token cannot be deleted)',
      insufficientKmsMatchesMessage:
        'Not enough admin key(s) found in key manager for this token. Provide --admin-key.',
      validationErrorOptions: { context: { tokenId } },
    });

    const tokenName = tokenInState?.name ?? tokenInfo.name;

    return {
      network,
      tokenId,
      tokenName,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenDeleteNormalizedParams,
  ): Promise<TokenDeleteBuildTransactionResult> {
    const { api } = args;
    api.logger.debug('Building token delete transaction');
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
    const { api } = args;
    api.logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
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
    const { transactionResult } = executeTransactionResult;
    const { network, tokenId, tokenName } = normalisedParams;
    const key = composeKey(network, tokenId);
    const tokenInState = this.tokenStateService.getToken(key);

    const removedAliases: string[] = [];

    if (tokenInState) {
      const aliasesForToken = args.api.alias
        .list({ network, type: AliasType.Token })
        .filter((rec) => rec.entityId === tokenId);

      for (const rec of aliasesForToken) {
        args.api.alias.remove(rec.alias, network);
        removedAliases.push(`${rec.alias} (${network})`);
      }

      this.tokenStateService.removeToken(key);
    }

    const outputData: TokenDeleteOutput = {
      transactionId: transactionResult.transactionId,
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
  const { api } = args;
  return new TokenDeleteCommand(
    new TokenReferenceServiceImpl(api.identityResolution),
    new TokenStateServiceImpl(api.state, api.logger),
  ).execute(args);
}
