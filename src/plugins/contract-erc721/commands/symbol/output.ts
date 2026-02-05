import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc721CallSymbolOutputSchema = z.object({
  contractId: EntityIdSchema,
  symbol: z.string(),
  network: SupportedNetwork,
});

export type ContractErc721CallSymbolOutput = z.infer<
  typeof ContractErc721CallSymbolOutputSchema
>;

export const CONTRACT_ERC721_CALL_SYMBOL_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "symbol" called successfully!
   Symbol: {{symbol}}
`.trim();
