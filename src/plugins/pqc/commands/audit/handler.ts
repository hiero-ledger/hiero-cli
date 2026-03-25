/**
 * PQC Audit Command Handler
 * Audits managed accounts for quantum-vulnerable key types
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PqcAuditOutput } from './output';
import type { KeyAuditResult } from '../../types';

import { PqcAuditInputSchema } from './input';
import { VulnerabilityTier, VULNERABILITY_LABELS } from '../../types';
import {
  classifyAlgorithm,
  detectKeyAlgorithm,
  calculateQRS,
  generateRecommendations,
} from '../../utils';

export const PQC_AUDIT_COMMAND_NAME = 'audit';

/**
 * Analyse a Hedera Key object and return audit results.
 * Handles ED25519, ECDSA, KeyList, and ThresholdKey structures.
 */
function analyseKey(
  keyType: string,
  keyData: unknown,
  hasAdminKey: boolean,
): KeyAuditResult[] {
  const results: KeyAuditResult[] = [];

  if (!keyData) return results;

  // The Hedera SDK key objects expose toBytes() for the public key
  const key = keyData as Record<string, unknown>;

  if (typeof key.toBytes === 'function') {
    const bytes = (key as { toBytes: () => Uint8Array }).toBytes();
    const algorithm = detectKeyAlgorithm(bytes);
    const { tier, label } = classifyAlgorithm(algorithm);

    results.push({
      keyType,
      algorithm,
      vulnerabilityTier: tier,
      vulnerabilityLabel: label,
      canRotate: hasAdminKey,
    });
  } else if (key._keys && Array.isArray(key._keys)) {
    // KeyList or ThresholdKey — recurse into sub-keys
    for (const subKey of key._keys) {
      results.push(
        ...analyseKey(`${keyType} (multi-sig)`, subKey, hasAdminKey),
      );
    }
  } else {
    // Unknown key structure — flag as critical
    results.push({
      keyType,
      algorithm: 'UNKNOWN',
      vulnerabilityTier: VulnerabilityTier.CRITICAL,
      vulnerabilityLabel: VULNERABILITY_LABELS[VulnerabilityTier.CRITICAL],
      canRotate: hasAdminKey,
    });
  }

  return results;
}

export class PqcAuditCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const validArgs = PqcAuditInputSchema.parse(args.args);

    logger.info('Starting PQC audit...');

    // Get managed accounts from state
    const accountState = api.state;
    const accounts: Array<{
      accountId: string;
      network: string;
      keyData?: unknown;
      adminKey?: unknown;
    }> = [];

    // Load accounts from the account plugin's namespace
    const accountNamespace = 'account-accounts';
    const storedAccounts = accountState.list(accountNamespace);

    for (const [, value] of Object.entries(storedAccounts)) {
      const accountData = value as Record<string, unknown>;
      if (validArgs.account && accountData.accountId !== validArgs.account) {
        continue;
      }
      if (validArgs.network && accountData.network !== validArgs.network) {
        continue;
      }
      accounts.push({
        accountId: accountData.accountId as string,
        network: accountData.network as string,
        keyData: accountData.keyData,
        adminKey: accountData.adminKey,
      });
    }

    logger.info(`Found ${accounts.length} account(s) to audit`);

    const entities: PqcAuditOutput['entities'] = [];
    let totalCritical = 0;
    let totalQRS = 0;

    for (const account of accounts) {
      const hasAdminKey = !!account.adminKey;
      const keys: KeyAuditResult[] = [];

      // Audit each key type
      if (account.adminKey) {
        keys.push(...analyseKey('admin', account.adminKey, true));
      }
      if (account.keyData) {
        keys.push(...analyseKey('account', account.keyData, hasAdminKey));
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

      const qrs = calculateQRS(keys, hasAdminKey);
      const recommendations = generateRecommendations(keys, hasAdminKey);

      const hasCritical = keys.some(
        (k) => k.vulnerabilityTier === VulnerabilityTier.CRITICAL,
      );
      if (hasCritical) totalCritical++;
      totalQRS += qrs;

      // Compliance: no Hiero account currently uses PQC
      const complianceFlags = {
        cnsa2_2027: keys.every(
          (k) => k.vulnerabilityTier <= VulnerabilityTier.STRONG,
        ),
        nist_fips_203: keys.some((k) => k.algorithm === 'ML_KEM_768'),
        nist_fips_204: keys.some((k) => k.algorithm === 'ML_DSA_65'),
      };

      entities.push({
        entityId: account.accountId,
        entityType: 'account',
        network: account.network as 'mainnet' | 'testnet' | 'previewnet' | 'localnet',
        keys,
        quantumReadinessScore: qrs,
        recommendations,
        complianceFlags,
      });
    }

    const outputData: PqcAuditOutput = {
      auditTimestamp: new Date().toISOString(),
      entities,
      totalAudited: entities.length,
      criticalCount: totalCritical,
      averageQRS:
        entities.length > 0 ? Math.round(totalQRS / entities.length) : 0,
    };

    return { result: outputData };
  }
}

export async function pqcAudit(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PqcAuditCommand().execute(args);
}
