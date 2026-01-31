import { z } from 'zod';

import { ContractNameSchema, EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallNameOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  network: SupportedNetwork,
});

export type ContractErc20CallNameOutput = z.infer<
  typeof ContractErc20CallNameOutputSchema
>;

export const CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "name" called successfully! 
   Contract name: {{contractName}}
`.trim();
