import { z } from 'zod';
import { EntityIdSchema } from '@/core/schemas/common-schemas';

/**
 * Output schema for contract call command
 */
export const CallContractOutputSchema = z.object({
  contractId: EntityIdSchema,
  functionName: z.string(),
  result: z.string(),
  resultHex: z.string(),
  gasUsed: z.number(),
});

export type CallContractOutput = z.infer<typeof CallContractOutputSchema>;

export const CALL_CONTRACT_TEMPLATE = `
📞 Contract Call Result

   Contract: {{contractId}}
   Function: {{functionName}}
   Gas Used: {{gasUsed}}

   Result (decoded): {{result}}
   Result (hex): {{resultHex}}
`.trim();
