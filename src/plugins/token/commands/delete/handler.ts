import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
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
import {
  extractPublicKeysFromMirrorNodeKey,
  getEffectiveKeyRequirement,
} from '@/core/utils/extract-public-keys';
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

    if (validArgs.adminKey.length > 0) {
      throw new ValidationError(
        '--state-only and --admin-key are mutually exclusive',
      );
    }

    const network = api.network.getCurrentNetwork();
    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;
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
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    if (!tokenInfo.admin_key) {
      throw new ValidationError(
        'Token has no admin key (immutable token cannot be deleted)',
        { context: { tokenId } },
      );
    }

    const extractedKeys = extractPublicKeysFromMirrorNodeKey(
      tokenInfo.admin_key,
    );
    const signatureRequirement = getEffectiveKeyRequirement(extractedKeys);
    if (signatureRequirement.publicKeys.length === 0) {
      throw new ValidationError(
        'Could not resolve admin key public keys from network',
        { context: { tokenId } },
      );
    }

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const stateKey = composeKey(network, tokenId);
    const tokenInState = tokenState.getToken(stateKey);

    let signingKeyRefIds: string[];

    if (validArgs.adminKey.length > 0) {
      const adminKeys = await Promise.all(
        validArgs.adminKey.map((cred) =>
          api.keyResolver.resolveSigningKey(cred, keyManager, false, [
            'token:admin',
          ]),
        ),
      );
      signingKeyRefIds = adminKeys.map((adminKey) => adminKey.keyRefId);
    } else {
      const refIds: string[] = [];
      const usedRefIds = new Set<string>();
      for (const publicKey of signatureRequirement.publicKeys) {
        const kmsRecord = api.kms.findByPublicKey(publicKey);
        if (kmsRecord && !usedRefIds.has(kmsRecord.keyRefId)) {
          usedRefIds.add(kmsRecord.keyRefId);
          refIds.push(kmsRecord.keyRefId);
          if (refIds.length >= signatureRequirement.requiredSignatures) {
            break;
          }
        }
      }
      if (refIds.length < signatureRequirement.requiredSignatures) {
        throw new ValidationError(
          'Not enough admin key(s) not found in key manager for this token. Provide --admin-key.',
          { context: { tokenId } },
        );
      }
      signingKeyRefIds = refIds;
    }

    const tokenName = tokenInState?.name ?? tokenInfo.name;

    return {
      network,
      tokenId,
      tokenName,
      signingKeyRefIds,
      keyRefIds: signingKeyRefIds,
    };
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
    logger.debug(
      `Using ${normalisedParams.signingKeyRefIds.length} key(s) for signing transaction`,
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

    return result;
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
      transactionId: executeTransactionResult.transactionId,
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
