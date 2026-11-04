/**
 * PQC Audit Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas';

const KeyAuditSchema = z.object({
  keyType: z.string().describe('Key role (admin, submit, supply, etc.)'),
  algorithm: z.string().describe('Cryptographic algorithm'),
  vulnerabilityTier: z.number().min(0).max(4).describe('0=PQC_READY, 4=CRITICAL'),
  vulnerabilityLabel: z.string().describe('Human-readable tier label'),
  canRotate: z.boolean().describe('Whether this key can be rotated'),
});

const ComplianceFlagsSchema = z.object({
  cnsa2_2027: z.boolean().describe('Aligned with CNSA 2.0 (2027 deadline)'),
  nist_fips_203: z.boolean().describe('Uses ML-KEM (FIPS 203)'),
  nist_fips_204: z.boolean().describe('Uses ML-DSA (FIPS 204)'),
});

const AuditEntrySchema = z.object({
  entityId: EntityIdSchema,
  entityType: z.enum(['account', 'topic', 'token']),
  network: NetworkSchema,
  keys: z.array(KeyAuditSchema),
  quantumReadinessScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
  complianceFlags: ComplianceFlagsSchema,
});

export const PqcAuditOutputSchema = z.object({
  auditTimestamp: z.string().describe('ISO timestamp of the audit'),
  entities: z.array(AuditEntrySchema),
  totalAudited: z.number().describe('Number of entities audited'),
  criticalCount: z
    .number()
    .describe('Number of entities with CRITICAL keys'),
  averageQRS: z
    .number()
    .describe('Average Quantum Readiness Score across all entities'),
});

export type PqcAuditOutput = z.infer<typeof PqcAuditOutputSchema>;

export const PQC_AUDIT_TEMPLATE = `
🔬 Post-Quantum Cryptography Audit Report
   Timestamp: {{auditTimestamp}}
   Entities audited: {{totalAudited}}
   Critical vulnerabilities: {{criticalCount}}
   Average Quantum Readiness Score: {{averageQRS}}/100

{{#if (eq totalAudited 0)}}
   No managed entities found to audit.
{{else}}
{{#each entities}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{add1 @index}}. {{entityType}} {{hashscanLink entityId entityType network}}
   Network: {{network}}
   Quantum Readiness Score: {{quantumReadinessScore}}/100

   Keys:
{{#each keys}}
   - {{keyType}}: {{algorithm}} [{{vulnerabilityLabel}}]
     Rotatable: {{#if canRotate}}Yes{{else}}No{{/if}}
{{/each}}

   Compliance:
   - CNSA 2.0 (2027): {{#if complianceFlags.cnsa2_2027}}✅{{else}}❌{{/if}}
   - NIST FIPS 203 (ML-KEM): {{#if complianceFlags.nist_fips_203}}✅{{else}}❌{{/if}}
   - NIST FIPS 204 (ML-DSA): {{#if complianceFlags.nist_fips_204}}✅{{else}}❌{{/if}}

   Recommendations:
{{#each recommendations}}
   → {{this}}
{{/each}}

{{/each}}
{{/if}}
`.trim();
