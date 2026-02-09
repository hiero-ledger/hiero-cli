import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractErc20CallTransferOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ContractErc20CallTransferOutput = z.infer<
  typeof ContractErc20CallTransferOutputSchema
>;

export const CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "transfer" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
