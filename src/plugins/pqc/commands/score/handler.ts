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
  classifyAlgorithm,
  calculateQRS,
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

    for (const [, value] of Object.entries(storedAccounts)) {
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

    // Default: all Hiero accounts use ED25519 unless specified otherwise
    const { tier, label } = classifyAlgorithm('ED25519');
    keys.push({
      keyType: 'account',
      algorithm: 'ED25519',
      vulnerabilityTier: tier,
      vulnerabilityLabel: label,
      canRotate: hasAdminKey,
    });

    if (hasAdminKey) {
      const adminClassification = classifyAlgorithm('ED25519');
      keys.push({
        keyType: 'admin',
        algorithm: 'ED25519',
        vulnerabilityTier: adminClassification.tier,
        vulnerabilityLabel: adminClassification.label,
        canRotate: true,
      });
    }

    const qrs = calculateQRS(keys, hasAdminKey);

    // Calculate individual breakdown scores
    const keyScore =
      keys.reduce((sum, k) => sum + ((4 - k.vulnerabilityTier) / 4) * 100, 0) /
      keys.length;
    const uniqueAlgs = new Set(keys.map((k) => k.algorithm));
    const algorithmDiversity =
      uniqueAlgs.size > 1 ? Math.min(uniqueAlgs.size * 25, 100) : 10;
    const rotationReadiness = hasAdminKey ? 80 : 0;

    const now = new Date();
    const deadline = new Date('2027-01-01T00:00:00Z');
    const daysUntil = Math.max(
      0,
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const complianceAlignment = Math.min((daysUntil / 365) * 50, 100);

    const outputData: PqcScoreOutput = {
      entityId: targetAccount.accountId as string,
      network: (targetAccount.network as string) as PqcScoreOutput['network'],
      quantumReadinessScore: qrs,
      breakdown: {
        keyScore: Math.round(keyScore),
        algorithmDiversity: Math.round(algorithmDiversity),
        rotationReadiness: Math.round(rotationReadiness),
        complianceAlignment: Math.round(complianceAlignment),
      },
      grade: qrsToGrade(qrs),
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
