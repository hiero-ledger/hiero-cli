import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractData } from '@/plugins/contract/schema';
import type { ImportContractOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ImportContractInputSchema } from './input';

export async function importContract(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  const validArgs = ImportContractInputSchema.parse(args.args);

  const contractRef = validArgs.contract;
  const alias = validArgs.alias;
  const contractName = validArgs.name;
  const verified = validArgs.verified;

  const network = api.network.getCurrentNetwork();

  try {
    if (alias) {
      api.alias.availableOrThrow(alias, network);
    }

    const contractInfo = await api.mirror.getContractInfo(contractRef);

    const contractId = contractInfo.contract_id;
    const contractEvmAddress = contractInfo.evm_address;

    if (!contractEvmAddress) {
      throw new Error(
        `Could not resolve EVM address for contract with ID '${contractId}'`,
      );
    }

    if (contractState.hasContract(contractId)) {
      throw new Error(
        `Contract with ID '${contractId}' already exists in state`,
      );
    }

    logger.info(`Importing contract ${contractId} ${contractName}`);

    if (alias) {
      api.alias.register({
        alias,
        type: 'contract',
        network,
        entityId: contractId,
        evmAddress: contractEvmAddress,
        createdAt: new Date().toISOString(),
      });
    }

    const contractData: ContractData = {
      contractId,
      contractName: contractName,
      contractEvmAddress,
      adminPublicKey: contractInfo.admin_key?.key,
      network,
      memo: contractInfo.memo || undefined,
      verified: false,
    };

    contractState.saveContract(contractId, contractData);

    const outputData: ImportContractOutput = {
      contractId,
      contractName: contractName,
      contractEvmAddress,
      ...(alias && { alias }),
      network,
      memo: contractInfo.memo || undefined,
      verified: verified,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to import contract', error),
    };
  }
}
