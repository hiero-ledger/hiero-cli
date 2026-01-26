import { z } from 'zod';
import {
  EntityIdSchema,
  IsoTimestampSchema,
} from '@/core/schemas/common-schemas';

/**
 * Output schema for contract deploy command
 */
export const DeployContractOutputSchema = z.object({
  contractId: EntityIdSchema,
  transactionId: z.string(),
  bytecodeSize: z.number(),
  gasUsed: z.number().optional(),
  memo: z.string().optional(),
  timestamp: IsoTimestampSchema,
});

export type DeployContractOutput = z.infer<typeof DeployContractOutputSchema>;

export const DEPLOY_CONTRACT_TEMPLATE = `
✅ Smart Contract Deployed Successfully

   Contract ID: {{contractId}}
   Transaction: {{transactionId}}
   Bytecode Size: {{bytecodeSize}} bytes
{{#if gasUsed}}   Gas Used: {{gasUsed}}
{{/if}}{{#if memo}}   Memo: {{memo}}
{{/if}}   Timestamp: {{timestamp}}
`.trim();
