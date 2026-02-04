import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const ContractErc20CallApproveOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ContractErc20CallApproveOutput = z.infer<
  typeof ContractErc20CallApproveOutputSchema
>;

export const CONTRACT_ERC20_CALL_APPROVE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "approve" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
