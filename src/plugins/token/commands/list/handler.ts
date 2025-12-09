/**
 * Token List Command Handler
 * Handles listing tokens from state for the current network
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TokenData } from '../../schema';
import { formatError } from '../../../../core/utils/errors';
import { ListTokensOutput } from './output';
import { ListTokenInputSchema } from './input';
import { findTokenAlias } from '../../../account/utils/balance-helpers';

/**
 * Displays a single token with comprehensive information
 * @param token - Token data to display
 * @param index - Token index in the list
 * @param showKeys - Whether to show key information
 * @param alias - Token alias (if available)
 * @param logger - Logger instance
 */
function displayToken(
  token: TokenData,
  index: number,
  showKeys: boolean,
  alias: string | undefined,
  logger: CommandHandlerArgs['logger'],
): void {
  // Display token name and symbol with alias
  let header = `${index + 1}. ${token.name} (${token.symbol})`;
  if (alias) {
    header += ` - alias: ${alias}`;
  }
  logger.info(header);

  // Show max supply for FINITE tokens
  if (token.supplyType === 'FINITE' && token.maxSupply > 0) {
    logger.info(`   Max Supply: ${token.maxSupply}`);
  }

  // Show associations count if present
  const associationCount = token.associations?.length || 0;
  if (associationCount > 0) {
    logger.info(`   Associations: ${associationCount}`);
  }
}

/**
 * Displays token statistics
 * @param stats - Token statistics
 * @param logger - Logger instance
 */
function displayStatistics(
  stats: {
    total: number;
    byNetwork: Record<string, number>;
    bySupplyType: Record<string, number>;
    withAssociations: number;
    totalAssociations: number;
  },
  logger: CommandHandlerArgs['logger'],
): void {
  logger.info('\n──────────────────────────────────────');
  logger.info(`Total Tokens: ${stats.total}`);

  // Show supply type breakdown
  if (Object.keys(stats.bySupplyType).length > 0) {
    logger.info('\nSupply Types:');
    Object.entries(stats.bySupplyType).forEach(([supplyType, count]) => {
      logger.info(`  ${supplyType}: ${count}`);
    });
  }

  // Show associations statistics
  if (stats.withAssociations > 0) {
    logger.info(
      `\nWith Associations: ${stats.withAssociations} (${stats.totalAssociations} total associations)`,
    );
  }

  // Show network breakdown if multiple networks
  if (Object.keys(stats.byNetwork).length > 1) {
    logger.info('\nBy Network:');
    Object.entries(stats.byNetwork).forEach(([network, count]) => {
      logger.info(`  ${network}: ${count}`);
    });
  }
}

export async function listTokens(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize token state helper
  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Parse command arguments
  const validArgs = ListTokenInputSchema.parse(args.args);

  const showKeys = validArgs.keys;
  const networkFilter = validArgs.network;

  // Determine which network to show
  const currentNetwork = api.network.getCurrentNetwork();
  const targetNetwork = networkFilter || currentNetwork;

  logger.info('Listing tokens...');
  logger.debug(`[TOKEN LIST] Current network: ${currentNetwork}`);
  logger.debug(`[TOKEN LIST] Target network: ${targetNetwork}`);
  logger.debug(
    `[TOKEN LIST] Network filter override: ${networkFilter || 'none'}`,
  );

  try {
    // Get all tokens
    let tokens = tokenState.listTokens();
    logger.debug(
      `[TOKEN LIST] Retrieved ${tokens.length} tokens from state before filtering`,
    );

    // Log all tokens before filtering
    tokens.forEach((token, index) => {
      logger.debug(
        `[TOKEN LIST]   ${index + 1}. ${token.name} (${token.symbol}) - ${token.tokenId} on ${token.network}`,
      );
    });

    // Filter by target network
    const tokensBeforeFilter = tokens.length;
    tokens = tokens.filter((token) => token.network === targetNetwork);
    logger.debug(
      `[TOKEN LIST] After network filtering: ${tokens.length} tokens (filtered out ${tokensBeforeFilter - tokens.length})`,
    );

    // Handle empty state
    if (tokens.length === 0) {
      if (tokensBeforeFilter > 0) {
        // Tokens exist but none match the current network
        logger.info(`\n⚠️  No tokens found for network: ${targetNetwork}`);
        logger.info(
          `\n💡 You have ${tokensBeforeFilter} token(s) on other networks.`,
        );
        logger.info(
          `   Use --network <network-name> to view tokens on a specific network.`,
        );
      } else if (networkFilter) {
        logger.info(`\nNo tokens found for network: ${networkFilter}`);
      } else {
        logger.info(`\nNo tokens found for current network: ${currentNetwork}`);
      }

      const outputData: ListTokensOutput = {
        tokens: [],
        count: 0,
        network: targetNetwork,
        stats: {
          total: 0,
          withKeys: 0,
          byNetwork: {},
          bySupplyType: {},
          withAssociations: 0,
          totalAssociations: 0,
        },
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    }

    // Display header
    logger.info(
      `\nFound ${tokens.length} token(s) for network ${targetNetwork}:`,
    );
    if (tokensBeforeFilter > tokens.length) {
      logger.info(
        `(${tokensBeforeFilter - tokens.length} token(s) filtered out from other networks)`,
      );
    }
    logger.info('──────────────────────────────────────');

    // Display each token and prepare output data
    const tokensList = tokens.map((token, index) => {
      // Resolve alias for this token
      const alias = findTokenAlias(api, token.tokenId, token.network);

      // Display token information
      displayToken(token, index, showKeys, alias, logger);

      // Add separator between tokens (except for the last one)
      if (index < tokens.length - 1) {
        logger.info('');
      }

      // Prepare token data for output
      return {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        supplyType: token.supplyType,
        treasuryId: token.treasuryId,
        network: token.network,
        alias,
      };
    });

    // Get statistics
    const stats = tokenState.getTokensWithStats();
    displayStatistics(stats, logger);

    // Prepare output data
    const outputData: ListTokensOutput = {
      tokens: tokensList,
      count: tokens.length,
      network: targetNetwork,
      stats: {
        total: stats.total,
        withKeys: 0, // Will need to calculate this
        byNetwork: stats.byNetwork,
        bySupplyType: stats.bySupplyType,
        withAssociations: stats.withAssociations,
        totalAssociations: stats.totalAssociations,
      },
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list tokens', error),
    };
  }
}
