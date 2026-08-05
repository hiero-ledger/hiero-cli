/**
 * PQC Report Command Output Schema and Template
 */
import { z } from 'zod';

export const PqcReportOutputSchema = z.object({
  format: z.enum(['json', 'csv', 'human']),
  totalEntities: z.number(),
  criticalCount: z.number(),
  averageQRS: z.number(),
  reportData: z.string().describe('Formatted report content'),
  generatedAt: z.string().describe('ISO timestamp'),
});

export type PqcReportOutput = z.infer<typeof PqcReportOutputSchema>;

export const PQC_REPORT_TEMPLATE = `
📊 PQC Compliance Report
   Generated: {{generatedAt}}
   Format: {{format}}
   Entities: {{totalEntities}}
   Critical: {{criticalCount}}
   Average QRS: {{averageQRS}}/100

{{reportData}}
`.trim();
