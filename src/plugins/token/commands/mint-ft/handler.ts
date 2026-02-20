import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { MintFtOutput } from './output';

import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { MintFtInputSchema } from './input';

export async function mintFt(args: CommandHandlerArgs): Promise<CommandResult> {
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
    throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
      context: { tokenIdOrAlias },
    });
  }

  const tokenId = resolvedToken.tokenId;

  logger.info(`Minting tokens for token: ${tokenId}`);

  const tokenInfo = await api.mirror.getTokenInfo(tokenId);

  const tokenData = tokenState.getToken(tokenId);

  if (tokenData && tokenData.tokenType !== HederaTokenType.FUNGIBLE_COMMON) {
    throw new ValidationError('Token is not fungible', {
      context: { tokenId },
    });
  }

  if (!tokenInfo.supply_key) {
    throw new ValidationError('Token has no supply key', {
      context: { tokenId },
    });
  }

  const supplyKeyResolved = await api.keyResolver.getOrInitKey(
    validArgs.supplyKey,
    keyManager,
    ['token:supply'],
  );

  const tokenSupplyKeyPublicKey = tokenInfo.supply_key.key;
  const providedSupplyKeyPublicKey = supplyKeyResolved.publicKey;

  if (tokenSupplyKeyPublicKey !== providedSupplyKeyPublicKey) {
    throw new ValidationError('Supply key mismatch', {
      context: { tokenId },
    });
  }

  logger.info(`Using supply key: ${supplyKeyResolved.accountId}`);

  const rawUnits = isRawUnits(userAmountInput);
  const tokenDecimals = rawUnits ? 0 : parseInt(tokenInfo.decimals);
  const rawAmount = processTokenBalanceInput(userAmountInput, tokenDecimals);

  if (rawAmount <= 0n) {
    throw new ValidationError('Amount must be greater than 0');
  }

  const maxSupply = BigInt(tokenInfo.max_supply || '0');
  const totalSupply = BigInt(tokenInfo.total_supply || '0');

  if (maxSupply > 0n) {
    const newTotalSupply = totalSupply + rawAmount;
    if (newTotalSupply > maxSupply) {
      throw new ValidationError('Mint would exceed max supply', {
        context: { tokenId, rawAmount, totalSupply, maxSupply },
      });
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
    throw new TransactionError('Token mint failed', false, {
      context: { tokenId },
    });
  }

  const outputData: MintFtOutput = {
    transactionId: result.transactionId,
    tokenId,
    amount: rawAmount,
    network,
  };

  return { result: outputData };
}
