/**
 * Token Display Helpers
 * Utility functions for displaying token information
 */
import { CommandHandlerArgs } from '../../../core';
import { TokenData } from '../schema';

export function displayToken(
  token: TokenData,
  index: number,
  showKeys: boolean,
  alias: string | undefined,
  logger: CommandHandlerArgs['logger'],
): void {
  let header = `${index + 1}. ${token.name} (${token.symbol})`;
  if (alias) {
    header += ` - alias: ${alias}`;
  }
  logger.info(header);

  if (token.supplyType === 'FINITE' && token.maxSupply > 0) {
    logger.info(`   Max Supply: ${token.maxSupply}`);
  }

  const associationCount = token.associations?.length || 0;
  if (associationCount > 0) {
    logger.info(`   Associations: ${associationCount}`);
  }
}

export function displayStatistics(
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

  if (Object.keys(stats.bySupplyType).length > 0) {
    logger.info('\nSupply Types:');
    Object.entries(stats.bySupplyType).forEach(([supplyType, count]) => {
      logger.info(`  ${supplyType}: ${count}`);
    });
  }

  if (stats.withAssociations > 0) {
    logger.info(
      `\nWith Associations: ${stats.withAssociations} (${stats.totalAssociations} total associations)`,
    );
  }

  if (Object.keys(stats.byNetwork).length > 1) {
    logger.info('\nBy Network:');
    Object.entries(stats.byNetwork).forEach(([network, count]) => {
      logger.info(`  ${network}: ${count}`);
    });
  }
}
