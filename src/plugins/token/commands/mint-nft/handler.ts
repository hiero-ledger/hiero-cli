/**
 * Token Mint NFT Command Handler
 * Handles NFT minting operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { MintNftOutput } from './output';

import { HederaTokenType, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { MintNftInputSchema } from './input';

const MAX_METADATA_BYTES = 100;

export async function mintNft(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
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
    throw new Error(
      `Failed to resolve token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  logger.info(`Minting NFT for token: ${tokenId}`);

  try {
    const metadataBytes = new TextEncoder().encode(metadataString);

    if (metadataBytes.length > MAX_METADATA_BYTES) {
      throw new Error(
        `Metadata exceeds maximum size of ${MAX_METADATA_BYTES} bytes. ` +
          `Current size: ${metadataBytes.length} bytes.`,
      );
    }

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const tokenData = tokenState.getToken(tokenId);

    if (
      tokenData &&
      tokenData.tokenType !== HederaTokenType.NON_FUNGIBLE_TOKEN
    ) {
      throw new Error(
        `Token ${tokenId} is not an NFT. This command only supports NFT tokens.`,
      );
    }

    if (!tokenInfo.supply_key) {
      throw new Error(
        `Token ${tokenId} does not have a supply key. Cannot mint NFTs without a supply key.`,
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

    const maxSupply = BigInt(tokenInfo.max_supply || '0');
    const totalSupply = BigInt(tokenInfo.total_supply || '0');

    if (maxSupply > 0n) {
      const newTotalSupply = totalSupply + 1n;
      if (newTotalSupply > maxSupply) {
        throw new Error(
          `Cannot mint NFT. ` +
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
      metadata: metadataBytes,
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
        errorMessage: 'NFT mint transaction failed',
      };
    }

    const serialNumber = result.receipt.serials![0];

    const outputData: MintNftOutput = {
      transactionId: result.transactionId,
      tokenId,
      serialNumber,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to mint NFT', error),
    };
  }
}
