import { z } from 'zod';

import {
  ContractNameSchema,
  EntityIdSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc20CallNameOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  network: NetworkSchema,
});

export type ContractErc20CallNameOutput = z.infer<
  typeof ContractErc20CallNameOutputSchema
>;

export const CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "name" called successfully! 
   Contract name: {{contractName}}
`.trim();
