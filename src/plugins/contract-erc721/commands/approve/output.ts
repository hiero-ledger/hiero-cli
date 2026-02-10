import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  TransactionIdSchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallApproveOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: SupportedNetwork,
  transactionId: TransactionIdSchema,
});

export type ContractErc721CallApproveOutput = z.infer<
  typeof ContractErc721CallApproveOutputSchema
>;

export const CONTRACT_ERC721_CALL_APPROVE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "approve" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
