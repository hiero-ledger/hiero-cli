/**
 * PQC Score Command Handler
 * Calculates detailed Quantum Readiness Score for a single entity
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PqcScoreOutput } from './output';
import type { KeyAuditResult } from '../../types';

import { NotFoundError } from '@/core';
import { PqcScoreInputSchema } from './input';
import { VulnerabilityTier } from '../../types';
import {
  analyseKey,
  classifyAlgorithm,
  calculateQRSWithBreakdown,
} from '../../utils';

export const PQC_SCORE_COMMAND_NAME = 'score';

function qrsToGrade(qrs: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (qrs >= 80) return 'A';
  if (qrs >= 60) return 'B';
  if (qrs >= 40) return 'C';
  if (qrs >= 20) return 'D';
  return 'F';
}

export class PqcScoreCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const validArgs = PqcScoreInputSchema.parse(args.args);

    logger.info(`Scoring account ${validArgs.account}...`);

    const accountNamespace = 'account-accounts';
    const storedAccounts = api.state.list(accountNamespace);
    let targetAccount: Record<string, unknown> | null = null;

    for (const value of storedAccounts) {
      const acc = value as Record<string, unknown>;
      if (
        acc.accountId === validArgs.account ||
        acc.name === validArgs.account
      ) {
        if (!validArgs.network || acc.network === validArgs.network) {
          targetAccount = acc;
          break;
        }
      }
    }

    if (!targetAccount) {
      throw new NotFoundError(
        `Account ${validArgs.account} not found in state. Import it first with 'hcli account import'.`,
      );
    }

    const hasAdminKey = !!targetAccount.adminKey;
    const keys: KeyAuditResult[] = [];

    // Analyse actual key data from state (reuses shared analyseKey)
    if (targetAccount.adminKey) {
      keys.push(...analyseKey('admin', targetAccount.adminKey, true));
    }
    if (targetAccount.keyData) {
      keys.push(
        ...analyseKey('account', targetAccount.keyData, hasAdminKey),
      );
    }

    // If no keys found in state, all Hiero accounts default to ED25519
    if (keys.length === 0) {
      const { tier, label } = classifyAlgorithm('ED25519');
      keys.push({
        keyType: 'account (default)',
        algorithm: 'ED25519',
        vulnerabilityTier: tier,
        vulnerabilityLabel: label,
        canRotate: hasAdminKey,
      });
    }

    // Single source of truth for QRS calculation + breakdown
    const breakdown = calculateQRSWithBreakdown(keys, hasAdminKey);

    const outputData: PqcScoreOutput = {
      entityId: targetAccount.accountId as string,
      network: (targetAccount.network as string) as PqcScoreOutput['network'],
      quantumReadinessScore: breakdown.total,
      breakdown: {
        keyScore: breakdown.keyScore,
        algorithmDiversity: breakdown.algorithmDiversity,
        rotationReadiness: breakdown.rotationReadiness,
        complianceAlignment: breakdown.complianceAlignment,
      },
      grade: qrsToGrade(breakdown.total),
      keyCount: keys.length,
      criticalKeyCount: keys.filter(
        (k) => k.vulnerabilityTier === VulnerabilityTier.CRITICAL,
      ).length,
    };

    return { result: outputData };
  }
}

export async function pqcScore(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PqcScoreCommand().execute(args);
}
