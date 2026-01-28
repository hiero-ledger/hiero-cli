import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type {
  ContractCreateFlowParams,
  ContractCreateFlowResult,
} from '@/core/services/contract-transaction/types';

import { ContractCreateFlow } from '@hashgraph/sdk';
import { ethers, getBytes } from 'ethers';

export class ContractTransactionServiceImpl implements ContractTransactionService {
  contractCreateFlowTransaction(
    params: ContractCreateFlowParams,
  ): ContractCreateFlowResult {
    const contractCreateTx = new ContractCreateFlow();
    if (params.bytecode) {
      contractCreateTx.setBytecode(params.bytecode);
    }
    if (params.adminKey) {
      contractCreateTx.setAdminKey(params.adminKey);
    }
    if (params.gas) {
      contractCreateTx.setGas(params.gas);
    }
    if (params.memo) {
      contractCreateTx.setContractMemo(params.memo);
    }
    if (params.abiDefinition && params.constructorParameters) {
      const abiInterfaces = new ethers.Interface(params.abiDefinition);
      const encodedConstructor = abiInterfaces.encodeDeploy(
        params.constructorParameters,
      );
      contractCreateTx.setConstructorParameters(getBytes(encodedConstructor));
    }
    return {
      transaction: contractCreateTx,
    };
  }
}
