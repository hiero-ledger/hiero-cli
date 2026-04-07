/**
 * Import Contract Command Handler
 * Imports contract from Hedera network by contract ID or EVM address
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractData } from '@/plugins/contract/schema';
import type { ContractImportOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ensureEvmAddress0xPrefix } from '@/core/utils/evm-address';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractImportInputSchema } from './input';

export class ImportContractCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const contractState = new ZustandContractStateHelper(api.state, logger);

    const validArgs = ContractImportInputSchema.parse(args.args);

    const contractRef = validArgs.contract;
    const name = validArgs.name;
    const verified = validArgs.verified;

    const network = api.network.getCurrentNetwork();

    if (name) {
      api.alias.availableOrThrow(name, network);
    }

    const contractInfo = await api.mirror.getContractInfo(contractRef);

    const contractId = contractInfo.contract_id;
    const contractEvmAddress = contractInfo.evm_address;

    if (!contractEvmAddress) {
      throw new NotFoundError(
        `Could not resolve EVM address for contract with ID '${contractId}'`,
      );
    }

    const normalizedContractEvmAddress =
      ensureEvmAddress0xPrefix(contractEvmAddress);

    const contractKey = composeKey(network, contractId);

    if (contractState.hasContract(contractKey)) {
      throw new StateError(
        `Contract with ID '${contractId}' already exists in state`,
      );
    }

    logger.info(
      name
        ? `Importing contract ${contractId} (name: ${name})`
        : `Importing contract ${contractId}`,
    );

    if (name) {
      api.alias.register({
        alias: name,
        type: AliasType.Contract,
        network,
        entityId: contractId,
        evmAddress: normalizedContractEvmAddress,
        createdAt: new Date().toISOString(),
      });
    }

    const contractData: ContractData = {
      contractId,
      name,
      contractEvmAddress: normalizedContractEvmAddress,
      adminPublicKey: contractInfo.admin_key?.key,
      network,
      memo: contractInfo.memo || undefined,
      verified,
    };

    contractState.saveContract(contractKey, contractData);

    const result: ContractImportOutput = {
      contractId,
      contractEvmAddress: normalizedContractEvmAddress,
      name,
      network,
      memo: contractInfo.memo || undefined,
      verified: verified,
    };

    return { result };
  }
}

export async function contractImport(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ImportContractCommand().execute(args);
}
