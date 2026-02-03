import { z } from 'zod';

import { ContractNameSchema, EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallNameOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractName: ContractNameSchema,
  network: SupportedNetwork,
});

export type ContractErc721CallNameOutput = z.infer<
  typeof ContractErc721CallNameOutputSchema
>;

export const CONTRACT_ERC721_CALL_NAME_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "name" called successfully!
   Contract name: {{contractName}}
`.trim();
