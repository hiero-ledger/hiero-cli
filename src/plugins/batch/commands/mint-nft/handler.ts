/**
 * Batch Mint NFT Command Handler
 *
 * Reads a CSV file with column: metadata
 * Mints NFTs sequentially to an existing NFT collection and reports results.
 *
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { BatchMintNftOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import {
  type BatchRowResult,
  executeBatch,
} from '@/plugins/batch/utils/batch-executor';
import { parseCsvFile } from '@/plugins/batch/utils/csv-parser';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';

import { BatchMintNftInputSchema } from './input';

interface NftMintRow {
  metadata: string;
}

const REQUIRED_HEADERS = ['metadata'];
const MAX_METADATA_BYTES = 100;

export async function batchMintNft(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = BatchMintNftInputSchema.parse(args.args);

  const keyManagerArg = validArgs.keyManager;
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  // Resolve token
  const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

  if (!resolvedToken) {
    return {
      status: Status.Failure,
      errorMessage: `Failed to resolve token: ${validArgs.token}. Expected format: token-name OR token-id`,
    };
  }

  const tokenId = resolvedToken.tokenId;

  // Verify the token is an NFT and has a supply key
  let tokenInfo;
  try {
    tokenInfo = await api.mirror.getTokenInfo(tokenId);
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to fetch token info for ${tokenId}`,
        error,
      ),
    };
  }

  if (tokenInfo.type !== 'NON_FUNGIBLE_UNIQUE') {
    return {
      status: Status.Failure,
      errorMessage: `Token ${tokenId} is not an NFT. This command only supports NFT tokens.`,
    };
  }

  if (!tokenInfo.supply_key) {
    return {
      status: Status.Failure,
      errorMessage: `Token ${tokenId} does not have a supply key. Cannot mint NFTs without a supply key.`,
    };
  }

  // Resolve supply key
  const supplyKeyResolved = await api.keyResolver.getOrInitKey(
    validArgs.supplyKey,
    keyManager,
    ['token:supply'],
  );

  const tokenSupplyKeyPublicKey = tokenInfo.supply_key.key;
  if (tokenSupplyKeyPublicKey !== supplyKeyResolved.publicKey) {
    return {
      status: Status.Failure,
      errorMessage: `The provided supply key does not match the token's supply key for ${tokenId}.`,
    };
  }

  // Parse CSV
  let rows: NftMintRow[];
  try {
    const csv = parseCsvFile<NftMintRow>(validArgs.file, REQUIRED_HEADERS);
    rows = csv.rows;
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to parse CSV file', error),
    };
  }

  logger.info(
    `Parsed ${rows.length} NFT(s) to mint from CSV for token ${tokenId}`,
  );

  // Check supply capacity
  const maxSupply = BigInt(tokenInfo.max_supply || '0');
  const totalSupply = BigInt(tokenInfo.total_supply || '0');

  if (maxSupply > 0n) {
    const newTotalSupply = totalSupply + BigInt(rows.length);
    if (newTotalSupply > maxSupply) {
      return {
        status: Status.Failure,
        errorMessage:
          `Cannot mint ${rows.length} NFTs. ` +
          `Current supply: ${totalSupply.toString()}, ` +
          `Max supply: ${maxSupply.toString()}, ` +
          `Remaining capacity: ${(maxSupply - totalSupply).toString()}`,
      };
    }
  }

  // Validate metadata sizes
  const validationErrors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.metadata || row.metadata.trim().length === 0) {
      validationErrors.push(`Row ${i + 1}: missing "metadata" field`);
      continue;
    }
    const metadataBytes = new TextEncoder().encode(row.metadata);
    if (metadataBytes.length > MAX_METADATA_BYTES) {
      validationErrors.push(
        `Row ${i + 1}: metadata exceeds ${MAX_METADATA_BYTES} bytes (got ${metadataBytes.length})`,
      );
    }
  }

  if (validationErrors.length > 0) {
    return {
      status: Status.Failure,
      errorMessage:
        `CSV validation failed:\n` +
        validationErrors.map((e) => `  - ${e}`).join('\n'),
    };
  }

  // Dry run
  if (validArgs.dryRun) {
    const dryRunResults = rows.map((row, i) => ({
      row: i + 1,
      status: 'success' as const,
      metadata: row.metadata,
    }));

    const output: BatchMintNftOutput = {
      total: rows.length,
      succeeded: rows.length,
      failed: 0,
      tokenId,
      network,
      dryRun: true,
      results: dryRunResults,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  }

  // Execute mints
  const summary = await executeBatch(
    rows,
    async (row: NftMintRow): Promise<Omit<BatchRowResult, 'row'>> => {
      const metadataBytes = new TextEncoder().encode(row.metadata);

      const mintTransaction = api.token.createMintTransaction({
        tokenId,
        metadata: metadataBytes,
      });

      const result = await api.txExecution.signAndExecuteWith(mintTransaction, [
        supplyKeyResolved.keyRefId,
      ]);

      if (!result.success) {
        return {
          status: 'failed',
          errorMessage: 'NFT mint transaction failed',
          details: { metadata: row.metadata },
        };
      }

      const serialNumber = result.receipt.serials![0];

      return {
        status: 'success',
        transactionId: result.transactionId,
        details: {
          metadata: row.metadata,
          serialNumber: Number(serialNumber),
        },
      };
    },
    logger,
  );

  const outputResults = summary.results.map((r) => ({
    row: r.row,
    status: r.status,
    metadata: r.details.metadata as string | undefined,
    serialNumber: r.details.serialNumber as number | undefined,
    transactionId: r.transactionId,
    errorMessage: r.errorMessage,
  }));

  const output: BatchMintNftOutput = {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    tokenId,
    network,
    dryRun: false,
    results: outputResults,
  };

  return {
    status: summary.failed === summary.total ? Status.Failure : Status.Success,
    outputJson: JSON.stringify(output),
    ...(summary.failed > 0 && summary.failed < summary.total
      ? {
          errorMessage: `${summary.failed} of ${summary.total} mints failed. See results for details.`,
        }
      : {}),
  };
}
