import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractErc20CallTransferFromOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ContractErc20CallTransferFromOutput = z.infer<
  typeof ContractErc20CallTransferFromOutputSchema
>;

export const CONTRACT_ERC20_CALL_TRANSFER_FROM_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "transferFrom" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
