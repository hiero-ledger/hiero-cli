import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractData } from '@/plugins/contract/schema';
import type { ImportContractOutput } from './output';

import { NotFoundError, ValidationError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ImportContractInputSchema } from './input';

export async function importContract(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  const validArgs = ImportContractInputSchema.parse(args.args);

  const contractRef = validArgs.contract;
  const alias = validArgs.alias;
  const contractName = validArgs.name;
  const verified = validArgs.verified;

  const network = api.network.getCurrentNetwork();

  if (alias) {
    api.alias.availableOrThrow(alias, network);
  }

  const contractInfo = await api.mirror.getContractInfo(contractRef);

  const contractId = contractInfo.contract_id;
  const contractEvmAddress = contractInfo.evm_address;

  if (!contractEvmAddress) {
    throw new NotFoundError(
      `Could not resolve EVM address for contract with ID '${contractId}'`,
    );
  }

  if (contractState.hasContract(contractId)) {
    throw new ValidationError(
      `Contract with ID '${contractId}' already exists in state`,
    );
  }

  logger.info(`Importing contract ${contractId} ${contractName}`);

  if (alias) {
    api.alias.register({
      alias,
      type: ALIAS_TYPE.Contract,
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
  const contractKey = composeKey(network, contractId);

  contractState.saveContract(contractKey, contractData);

  const result: ImportContractOutput = {
    contractId,
    contractName: contractName,
    contractEvmAddress,
    alias,
    network,
    memo: contractInfo.memo || undefined,
    verified: verified,
  };

  return { result };
}
