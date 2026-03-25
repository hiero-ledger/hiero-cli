/**
 * PQC Report Command Handler
 * Generates a comprehensive PQC compliance report in multiple formats
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PqcReportOutput } from './output';

import { PqcReportInputSchema } from './input';
import { pqcAudit } from '../audit/handler';
import type { PqcAuditOutput } from '../audit/output';

export const PQC_REPORT_COMMAND_NAME = 'report';

export class PqcReportCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger } = args;
    const validArgs = PqcReportInputSchema.parse(args.args);

    logger.info(`Generating PQC report (format: ${validArgs.format})...`);

    // Run the audit first to gather all data
    const auditArgs = {
      ...args,
      args: { network: validArgs.network },
    };
    const auditResult = await pqcAudit(auditArgs);
    const auditData = auditResult.result as PqcAuditOutput;

    let reportData: string;

    switch (validArgs.format) {
      case 'json':
        reportData = JSON.stringify(auditData, null, 2);
        break;

      case 'csv': {
        const headers = [
          'entity_id',
          'entity_type',
          'network',
          'qrs',
          'key_type',
          'algorithm',
          'vulnerability',
          'can_rotate',
          'cnsa2_2027',
          'fips_203',
          'fips_204',
        ];
        const rows = auditData.entities.flatMap((entity) =>
          entity.keys.map((key) =>
            [
              entity.entityId,
              entity.entityType,
              entity.network,
              entity.quantumReadinessScore,
              key.keyType,
              key.algorithm,
              key.vulnerabilityLabel,
              key.canRotate,
              entity.complianceFlags.cnsa2_2027,
              entity.complianceFlags.nist_fips_203,
              entity.complianceFlags.nist_fips_204,
            ].join(','),
          ),
        );
        reportData = [headers.join(','), ...rows].join('\n');
        break;
      }

      case 'human':
      default:
        reportData = auditData.entities
          .map(
            (e) =>
              `${e.entityId} (${e.network}): QRS ${e.quantumReadinessScore}/100 — ${e.keys.length} key(s), ${e.recommendations.length} recommendation(s)`,
          )
          .join('\n');
        break;
    }

    const outputData: PqcReportOutput = {
      format: validArgs.format,
      totalEntities: auditData.totalAudited,
      criticalCount: auditData.criticalCount,
      averageQRS: auditData.averageQRS,
      reportData,
      generatedAt: new Date().toISOString(),
    };

    return { result: outputData };
  }
}

export async function pqcReport(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PqcReportCommand().execute(args);
}
