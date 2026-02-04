import { z } from 'zod';

import { EntityIdSchema, EvmAddressSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallOwnerOfOutputSchema = z.object({
  contractId: EntityIdSchema,
  owner: EvmAddressSchema,
  network: SupportedNetwork,
});

export type ContractErc721CallOwnerOfOutput = z.infer<
  typeof ContractErc721CallOwnerOfOutputSchema
>;

export const CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "ownerOf" called successfully!
   Owner: {{owner}}
`.trim();
