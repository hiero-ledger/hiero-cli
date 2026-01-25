import { z } from 'zod';
import {
  EntityIdSchema,
  IsoTimestampSchema,
} from '@/core/schemas/common-schemas';

/**
 * Output schema for contract info command
 */
export const ContractInfoOutputSchema = z.object({
  contractId: EntityIdSchema,
  evmAddress: z.string().optional(),
  balance: z.string(),
  deleted: z.boolean(),
  memo: z.string().optional(),
  adminKey: z.string().optional(),
  autoRenewAccountId: z.string().optional(),
  autoRenewPeriod: z.number().optional(),
  createdTimestamp: z.string().optional(),
  expirationTimestamp: z.string().optional(),
  maxAutomaticTokenAssociations: z.number().optional(),
  runtimeBytecodeHash: z.string().optional(),
});

export type ContractInfoOutput = z.infer<typeof ContractInfoOutputSchema>;

export const CONTRACT_INFO_TEMPLATE = `
📋 Contract Information

   Contract ID: {{contractId}}
{{#if evmAddress}}   EVM Address: {{evmAddress}}
{{/if}}   Balance: {{balance}} HBAR
   Deleted: {{deleted}}
{{#if memo}}   Memo: {{memo}}
{{/if}}{{#if adminKey}}   Admin Key: {{adminKey}}
{{/if}}{{#if autoRenewAccountId}}   Auto-Renew Account: {{autoRenewAccountId}}
{{/if}}{{#if autoRenewPeriod}}   Auto-Renew Period: {{autoRenewPeriod}} seconds
{{/if}}{{#if maxAutomaticTokenAssociations}}   Max Token Associations: {{maxAutomaticTokenAssociations}}
{{/if}}{{#if createdTimestamp}}   Created: {{createdTimestamp}}
{{/if}}{{#if expirationTimestamp}}   Expires: {{expirationTimestamp}}
{{/if}}{{#if runtimeBytecodeHash}}   Bytecode Hash: {{runtimeBytecodeHash}}
{{/if}}
`.trim();
