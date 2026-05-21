/**
 * PQC Plugin Manifest
 * Post-Quantum Cryptography readiness assessment for Hiero accounts
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  PQC_AUDIT_TEMPLATE,
  pqcAudit,
  PqcAuditOutputSchema,
} from './commands/audit';
import {
  PQC_SCORE_TEMPLATE,
  pqcScore,
  PqcScoreOutputSchema,
} from './commands/score';
import {
  PQC_REPORT_TEMPLATE,
  pqcReport,
  PqcReportOutputSchema,
} from './commands/report';

export const PQC_NAMESPACE = 'pqc-audits';

export const pqcPluginManifest: PluginManifest = {
  name: 'pqc',
  version: '0.1.0',
  displayName: 'PQC Readiness Plugin',
  description:
    'Post-Quantum Cryptography readiness assessment for Hiero accounts, topics, and tokens. Identifies quantum-vulnerable key types and calculates Quantum Readiness Scores aligned with NIST FIPS 203/204 and CNSA 2.0.',
  commands: [
    {
      name: 'audit',
      summary: 'Audit accounts for quantum-vulnerable keys',
      description:
        'Scan managed accounts for quantum-vulnerable cryptographic key types (ED25519, ECDSA). Reports vulnerability tiers, Quantum Readiness Scores, and compliance flags for CNSA 2.0 and NIST FIPS 203/204.',
      options: [
        {
          name: 'account',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID or alias to audit. If omitted, audits all managed accounts.',
          short: 'a',
        },
        {
          name: 'network',
          type: OptionType.STRING,
          required: false,
          description: 'Filter by network (mainnet, testnet, previewnet)',
          short: 'n',
        },
      ],
      handler: pqcAudit,
      output: {
        schema: PqcAuditOutputSchema,
        humanTemplate: PQC_AUDIT_TEMPLATE,
      },
    },
    {
      name: 'score',
      summary: 'Calculate Quantum Readiness Score',
      description:
        'Calculate a detailed Quantum Readiness Score (QRS) for a specific account, with breakdown by key vulnerability, algorithm diversity, rotation readiness, and CNSA 2.0 compliance alignment.',
      options: [
        {
          name: 'account',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or alias to score',
          short: 'a',
        },
        {
          name: 'network',
          type: OptionType.STRING,
          required: false,
          description: 'Network of the account',
          short: 'n',
        },
      ],
      handler: pqcScore,
      output: {
        schema: PqcScoreOutputSchema,
        humanTemplate: PQC_SCORE_TEMPLATE,
      },
    },
    {
      name: 'report',
      summary: 'Generate PQC compliance report',
      description:
        'Generate a comprehensive post-quantum cryptography compliance report across all managed accounts. Supports JSON, CSV, and human-readable output formats.',
      options: [
        {
          name: 'format',
          type: OptionType.STRING,
          required: false,
          description: 'Output format: json, csv, or human (default: human)',
          short: 'f',
        },
        {
          name: 'network',
          type: OptionType.STRING,
          required: false,
          description: 'Filter by network',
          short: 'n',
        },
      ],
      handler: pqcReport,
      output: {
        schema: PqcReportOutputSchema,
        humanTemplate: PQC_REPORT_TEMPLATE,
      },
    },
  ],
};

export default pqcPluginManifest;
