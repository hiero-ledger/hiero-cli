/**
 * Token Mint FT Command Handler
 * Handles fungible token minting operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { MintFtOutput } from './output';

import { HederaTokenType, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { MintFtInputSchema } from './input';

export async function mintFt(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = MintFtInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const userAmountInput = validArgs.amount;
  const keyManagerArg = validArgs.keyManager;

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new Error(
      `Failed to resolve token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  logger.info(`Minting tokens for token: ${tokenId}`);

  try {
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenDecimals = parseInt(tokenInfo.decimals) || 0;
    const tokenData = tokenState.getToken(tokenId);

    if (tokenData && tokenData.tokenType !== HederaTokenType.FUNGIBLE_COMMON) {
      if (tokenDecimals === 0) {
        throw new Error(
          `Token ${tokenId} is not a fungible token. This command only supports fungible tokens.`,
        );
      }
      logger.warn(
        `Token ${tokenId} has incorrect tokenType in state but has decimals (${tokenDecimals}), treating as fungible token.`,
      );
    } else if (!tokenData && tokenDecimals === 0) {
      logger.warn(
        `Token ${tokenId} appears to be an NFT (no decimals). Minting may fail.`,
      );
    }

    if (!tokenInfo.supply_key) {
      throw new Error(
        `Token ${tokenId} does not have a supply key. Cannot mint tokens without a supply key.`,
      );
    }

    const supplyKeyResolved = await api.keyResolver.getOrInitKey(
      validArgs.supplyKey,
      keyManager,
      ['token:supply'],
    );

    const tokenSupplyKeyPublicKey = tokenInfo.supply_key.key;
    const providedSupplyKeyPublicKey = supplyKeyResolved.publicKey;

    if (tokenSupplyKeyPublicKey !== providedSupplyKeyPublicKey) {
      throw new Error(
        `The provided supply key does not match the token's supply key. ` +
          `Token ${tokenId} requires a different supply key.`,
      );
    }

    logger.info(`Using supply key: ${supplyKeyResolved.accountId}`);

    const isRawUnits = String(userAmountInput).trim().endsWith('t');
    const rawAmount = processTokenBalanceInput(
      userAmountInput,
      isRawUnits ? 0 : tokenDecimals,
    );

    if (rawAmount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    const maxSupply = BigInt(tokenInfo.max_supply || '0');
    const totalSupply = BigInt(tokenInfo.total_supply || '0');

    if (maxSupply > 0n) {
      const newTotalSupply = totalSupply + rawAmount;
      if (newTotalSupply > maxSupply) {
        throw new Error(
          `Cannot mint ${rawAmount.toString()} tokens. ` +
            `Current supply: ${totalSupply.toString()}, ` +
            `Max supply: ${maxSupply.toString()}, ` +
            `Would exceed by: ${(newTotalSupply - maxSupply).toString()}`,
        );
      }
      logger.info(
        `Token has finite supply. Current: ${totalSupply.toString()}, Max: ${maxSupply.toString()}, After mint: ${newTotalSupply.toString()}`,
      );
    }

    const mintTransaction = api.token.createMintTransaction({
      tokenId,
      amount: rawAmount,
    });

    logger.debug(
      `Using key ${supplyKeyResolved.keyRefId} for signing transaction`,
    );
    const result = await api.txExecution.signAndExecuteWith(mintTransaction, [
      supplyKeyResolved.keyRefId,
    ]);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage: 'Token mint transaction failed',
      };
    }

    const outputData: MintFtOutput = {
      transactionId: result.transactionId,
      tokenId,
      amount: rawAmount,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to mint token', error),
    };
  }
}
