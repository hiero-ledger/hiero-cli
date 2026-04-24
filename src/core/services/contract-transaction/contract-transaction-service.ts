import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type {
  ContractCreateFlowParams,
  ContractCreateFlowResult,
  ContractDeleteResult,
  ContractExecuteBaseParams,
  ContractExecuteEncodedParams,
  ContractExecuteParams,
  ContractExecuteResult,
  DeleteContractParams,
} from '@/core/services/contract-transaction/types';

import {
  AccountId,
  ContractCreateFlow,
  ContractDeleteTransaction,
  ContractExecuteTransaction,
  ContractId,
  Hbar,
} from '@hashgraph/sdk';
import { ethers, getBytes } from 'ethers';

import { ValidationError } from '@/core/errors';

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
    if (params.initialBalanceRaw !== undefined) {
      contractCreateTx.setInitialBalance(
        Hbar.fromTinybars(params.initialBalanceRaw.toString()),
      );
    }
    if (params.autoRenewPeriod !== undefined) {
      contractCreateTx.setAutoRenewPeriod(params.autoRenewPeriod);
    }
    if (params.autoRenewAccountId) {
      contractCreateTx.setAutoRenewAccountId(
        AccountId.fromString(params.autoRenewAccountId),
      );
    }
    if (params.maxAutomaticTokenAssociations !== undefined) {
      contractCreateTx.setMaxAutomaticTokenAssociations(
        params.maxAutomaticTokenAssociations,
      );
    }
    if (params.stakedAccountId) {
      contractCreateTx.setStakedAccountId(params.stakedAccountId);
    }
    if (params.stakedNodeId !== undefined) {
      contractCreateTx.setStakedNodeId(params.stakedNodeId);
    }
    if (params.declineStakingReward !== undefined) {
      contractCreateTx.setDeclineStakingReward(params.declineStakingReward);
    }
    return {
      transaction: contractCreateTx,
    };
  }

  private createBaseContractExecuteTx(
    params: ContractExecuteBaseParams,
  ): ContractExecuteTransaction {
    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(params.contractId))
      .setGas(params.gas);

    if (params.payableAmountTinybars) {
      tx.setPayableAmount(Hbar.fromTinybars(params.payableAmountTinybars));
    }

    return tx;
  }

  contractExecuteTransaction(
    params: ContractExecuteParams,
  ): ContractExecuteResult {
    const contractExecuteTx = this.createBaseContractExecuteTx(params);
    contractExecuteTx.setFunction(
      params.functionName,
      params.functionParameters,
    );
    return {
      transaction: contractExecuteTx,
    };
  }

  contractExecuteWithEncodedParams(
    params: ContractExecuteEncodedParams,
  ): ContractExecuteResult {
    const contractExecuteTx = this.createBaseContractExecuteTx(params);
    contractExecuteTx.setFunctionParameters(params.functionParametersEncoded);
    return {
      transaction: contractExecuteTx,
    };
  }

  deleteContract(params: DeleteContractParams): ContractDeleteResult {
    try {
      const transaction = new ContractDeleteTransaction().setContractId(
        ContractId.fromString(params.contractId),
      );
      if (params.transferAccountId) {
        transaction.setTransferAccountId(
          AccountId.fromString(params.transferAccountId),
        );
      }
      if (params.transferContractId) {
        transaction.setTransferContractId(
          ContractId.fromString(params.transferContractId),
        );
      }
      return { transaction };
    } catch (error) {
      throw new ValidationError('Invalid contract delete parameters', {
        context: {
          contractId: params.contractId,
          transferAccountId: params.transferAccountId,
          transferContractId: params.transferContractId,
        },
        cause: error,
      });
    }
  }
}
