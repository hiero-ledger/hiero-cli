import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  AliasNameSchema,
  AmountInputSchema,
  AutoRenewPeriodSecondsSchema,
  FilePathSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  KeyThresholdOptionalSchema,
  MaxAutoAssociationsSchema,
  MemoSchema,
  NodeIdSchema,
  OptionalDefaultEmptyKeyListSchema,
  SolidityCompilerVersion,
} from '@/core/schemas';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';
import { DefaultTemplateSchema } from '@/plugins/contract/utils/contract-file-helpers';

const contractCreateInputObjectSchema = z.object({
  name: AliasNameSchema.describe('Optional name/alias for the contract'),
  file: FilePathSchema.optional().describe(
    'Filesystem path to Solidity file containing smart contract definition',
  ),
  default: DefaultTemplateSchema.optional().describe(
    'Use built-in contract template: erc20 or erc721',
  ),
  gas: GasInputSchema.default(2000000).describe(
    'Gas for contract creation. Default: 2000000',
  ),
  basePath: FilePathSchema.optional().describe(
    'Base path to main directory of smart contract path',
  ),
  adminKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Admin key(s). Pass multiple times for multiple keys. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
  ),
  adminKeyThreshold: KeyThresholdOptionalSchema.describe(
    'Number of admin keys required to sign (M-of-N)',
  ),
  memo: MemoSchema.describe(
    'Optional memo for the contract (max 100 characters)',
  ),
  solidityVersion: SolidityCompilerVersion,
  constructorParameter: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Parameters that are out inside smart contract constructor'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
  initialBalance: AmountInputSchema.optional().describe(
    'Initial HBAR balance for the contract. Format: "100" (HBAR) or "100t" (tinybars)',
  ),
  autoRenewPeriod: AutoRenewPeriodSecondsSchema.describe(
    'Auto-renew period: integer seconds, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 30d)',
  ),
  autoRenewAccountId: AccountReferenceObjectSchema.optional().describe(
    'Account that will pay for auto-renewal: ID (0.0.xxx), alias, or EVM address',
  ),
  maxAutomaticTokenAssociations: MaxAutoAssociationsSchema.describe(
    'Maximum number of automatic token associations (-1 for unlimited, 0 to disable)',
  ),
  stakedAccountId: AccountReferenceObjectSchema.optional().describe(
    'Account to stake this contract to: ID (0.0.xxx), alias, or EVM address',
  ),
  stakedNodeId: NodeIdSchema.describe('Node ID to stake this contract to'),
  declineStakingReward: z
    .boolean()
    .optional()
    .describe('Whether to decline staking rewards'),
});

export const ContractCreateSchema = contractCreateInputObjectSchema
  .superRefine((data, context) => {
    applyKeyThresholdSuperRefine(data, context, [
      {
        thresholdField: 'adminKeyThreshold',
        getKeyCount: (row) => row.adminKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'adminKeyThreshold can only be set when multiple admin keys are provided',
          thresholdExceedsKeyCount:
            'adminKeyThreshold must not exceed the number of admin keys provided',
        },
      },
    ]);

    if (data.stakedAccountId !== undefined && data.stakedNodeId !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot specify both --staked-account-id and --staked-node-id',
        path: ['stakedNodeId'],
      });
    }
  })
  .refine((data) => (data.file ? !data.default : !!data.default), {
    message: 'Either --file or --default must be provided, but not both',
  })
  .transform((data) => ({
    name: data.name,
    file: data.file,
    defaultTemplate: data.default,
    gas: data.gas,
    basePath: data.basePath,
    adminKeys: data.adminKey,
    adminKeyThreshold: data.adminKeyThreshold,
    memo: data.memo,
    solidityVersion: data.solidityVersion,
    constructorParameters: data.constructorParameter,
    keyManager: data.keyManager,
    initialBalance: data.initialBalance,
    autoRenewPeriod: data.autoRenewPeriod,
    autoRenewAccountId: data.autoRenewAccountId,
    maxAutomaticTokenAssociations: data.maxAutomaticTokenAssociations,
    stakedAccountId: data.stakedAccountId,
    stakedNodeId: data.stakedNodeId,
    declineStakingReward: data.declineStakingReward,
  }));
