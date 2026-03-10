import type {
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';

export interface TxSignService {
  sign(
    transaction: HederaTransaction,
    keyRefIds: string[],
  ): Promise<HederaTransaction>;
  signContractCreateFlow(
    transaction: ContractCreateFlow,
    keyRefIds: string[],
  ): ContractCreateFlow;
}
