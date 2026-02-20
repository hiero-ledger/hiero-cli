import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { MintNftOutput } from './output';

import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { MintNftInputSchema } from './input';

const MAX_METADATA_BYTES = 100;

export async function mintNft(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = MintNftInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const metadataString = validArgs.metadata;
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

  logger.info(`Minting NFT for token: ${tokenId}`);

  const metadataBytes = new TextEncoder().encode(metadataString);

  if (metadataBytes.length > MAX_METADATA_BYTES) {
    throw new ValidationError('Metadata exceeds 100 bytes', {
      context: { tokenId, size: metadataBytes.length },
    });
  }

  const tokenInfo = await api.mirror.getTokenInfo(tokenId);

  const tokenData = tokenState.getToken(tokenId);

  if (tokenData && tokenData.tokenType !== HederaTokenType.NON_FUNGIBLE_TOKEN) {
    throw new ValidationError('Token is not an NFT', {
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

  const maxSupply = BigInt(tokenInfo.max_supply || '0');
  const totalSupply = BigInt(tokenInfo.total_supply || '0');

  if (maxSupply > 0n) {
    const newTotalSupply = totalSupply + 1n;
    if (newTotalSupply > maxSupply) {
      throw new ValidationError('Mint would exceed max supply', {
        context: { tokenId, totalSupply, maxSupply },
      });
    }
    logger.info(
      `Token has finite supply. Current: ${totalSupply.toString()}, Max: ${maxSupply.toString()}, After mint: ${newTotalSupply.toString()}`,
    );
  }

  const mintTransaction = api.token.createMintTransaction({
    tokenId,
    metadata: metadataBytes,
  });

  logger.debug(
    `Using key ${supplyKeyResolved.keyRefId} for signing transaction`,
  );
  const result = await api.txExecution.signAndExecuteWith(mintTransaction, [
    supplyKeyResolved.keyRefId,
  ]);

  if (!result.success) {
    throw new TransactionError('NFT mint failed', false, {
      context: { tokenId },
    });
  }

  const serialNumber = result.receipt.serials![0];

  const outputData: MintNftOutput = {
    transactionId: result.transactionId,
    tokenId,
    serialNumber,
    network,
  };

  return { result: outputData };
}
