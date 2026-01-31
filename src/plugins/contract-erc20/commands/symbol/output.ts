import { z } from 'zod';

import { EntityIdSchema, TokenSymbolSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallSymbolOutputSchema = z.object({
  contractId: EntityIdSchema,
  contractSymbol: TokenSymbolSchema,
  network: SupportedNetwork,
});

export type ContractErc20CallSymbolOutput = z.infer<
  typeof ContractErc20CallSymbolOutputSchema
>;

export const CONTRACT_ERC20_CALL_SYMBOL_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "symbol" called successfully! 
   Contract symbol: {{contractSymbol}}
`.trim();
