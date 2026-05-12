import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractErc721CallSafeTransferFromOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ContractErc721CallSafeTransferFromOutput = z.infer<
  typeof ContractErc721CallSafeTransferFromOutputSchema
>;

export const CONTRACT_ERC721_CALL_SAFE_TRANSFER_FROM_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "safeTransferFrom" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
