import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  TransactionIdSchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallTransferOutputSchema = z.object({
  contractIdOrEvm: EntityOrEvmAddressReferenceSchema,
  network: SupportedNetwork,
  transactionId: TransactionIdSchema,
});

export type ContractErc20CallTransferOutput = z.infer<
  typeof ContractErc20CallTransferOutputSchema
>;

export const CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE = `
✅ Contract ({{hashscanLink contractIdOrEvm "contract" network}}) function "transfer" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
