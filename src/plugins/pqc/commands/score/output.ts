/**
 * PQC Score Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas';

export const PqcScoreOutputSchema = z.object({
  entityId: EntityIdSchema,
  network: NetworkSchema,
  quantumReadinessScore: z.number().min(0).max(100),
  breakdown: z.object({
    keyScore: z.number().describe('Key vulnerability score (0-100)'),
    algorithmDiversity: z.number().describe('Algorithm diversity score (0-100)'),
    rotationReadiness: z.number().describe('Key rotation readiness score (0-100)'),
    complianceAlignment: z.number().describe('CNSA 2.0 timeline alignment (0-100)'),
  }),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']).describe('Letter grade'),
  keyCount: z.number().describe('Total keys analysed'),
  criticalKeyCount: z.number().describe('Keys with CRITICAL vulnerability'),
});

export type PqcScoreOutput = z.infer<typeof PqcScoreOutputSchema>;

export const PQC_SCORE_TEMPLATE = `
🎯 Quantum Readiness Score for {{hashscanLink entityId "account" network}}
   Network: {{network}}

   ╔══════════════════════════════════╗
   ║  QRS: {{quantumReadinessScore}}/100  Grade: {{grade}}      ║
   ╚══════════════════════════════════╝

   Score Breakdown:
   ├─ Key Vulnerability:     {{breakdown.keyScore}}/100 (weight: 40%)
   ├─ Algorithm Diversity:   {{breakdown.algorithmDiversity}}/100 (weight: 20%)
   ├─ Rotation Readiness:    {{breakdown.rotationReadiness}}/100 (weight: 20%)
   └─ Compliance Alignment:  {{breakdown.complianceAlignment}}/100 (weight: 20%)

   Keys: {{keyCount}} total, {{criticalKeyCount}} critical
`.trim();
