import { z } from 'zod';

import {
  EntityOrEvmAddressReferenceSchema,
  TransactionIdSchema,
} from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallMintOutputSchema = z.object({
  contractId: EntityOrEvmAddressReferenceSchema,
  network: SupportedNetwork,
  transactionId: TransactionIdSchema,
});

export type ContractErc721CallMintOutput = z.infer<
  typeof ContractErc721CallMintOutputSchema
>;

export const CONTRACT_ERC721_CALL_MINT_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "mint" called successfully!
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
