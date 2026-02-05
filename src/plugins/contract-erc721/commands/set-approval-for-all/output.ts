import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  TransactionIdSchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallSetApprovalForAllOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: SupportedNetwork,
  transactionId: TransactionIdSchema,
});

export type ContractErc721CallSetApprovalForAllOutput = z.infer<
  typeof ContractErc721CallSetApprovalForAllOutputSchema
>;

export const CONTRACT_ERC721_CALL_SET_APPROVAL_FOR_ALL_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "setApprovalForAll" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
