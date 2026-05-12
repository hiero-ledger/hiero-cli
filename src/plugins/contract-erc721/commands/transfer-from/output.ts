import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractErc721CallTransferFromOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ContractErc721CallTransferFromOutput = z.infer<
  typeof ContractErc721CallTransferFromOutputSchema
>;

export const CONTRACT_ERC721_CALL_TRANSFER_FROM_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "transferFrom" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
