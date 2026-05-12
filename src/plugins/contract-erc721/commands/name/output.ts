import { z } from 'zod';

import {
  ContractNameSchema,
  EntityIdSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc721CallNameOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  network: NetworkSchema,
});

export type ContractErc721CallNameOutput = z.infer<
  typeof ContractErc721CallNameOutputSchema
>;

export const CONTRACT_ERC721_CALL_NAME_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "name" called successfully!
   Contract name: {{contractName}}
`.trim();
