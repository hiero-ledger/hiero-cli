import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractData } from '@/plugins/contract/schema';
import type { ContractImportOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { ensureEvmAddress0xPrefix } from '@/core/utils/evm-address';
import { extractPublicKeysFromMirrorNodeKey } from '@/core/utils/extract-public-keys';
import { composeKey } from '@/core/utils/key-composer';
import { matchPublicKeysToKmsRefIds } from '@/core/utils/match-keys-to-kms';
import { ContractStateServiceImpl } from '@/plugins/contract/services/contract-state.service';
import { type ContractStateService } from '@/plugins/contract/services/contract-state.service.interface';

import { ContractImportInputSchema } from './input';

export class ImportContractCommand implements Command {
  constructor(private readonly contractState: ContractStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ContractImportInputSchema.parse(args.args);

    const contractRef = validArgs.contract;
    const name = validArgs.name;

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

    if (this.contractState.hasContract(contractKey)) {
      throw new StateError(
        `Contract with ID '${contractId}' already exists in state`,
      );
    }

    const verified =
      await api.contractVerifier.isVerifiedFullMatchOnRepository(
        contractEvmAddress,
      );

    api.logger.info(`Importing contract ${contractId}`);

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

    const adminKeysExtracted = extractPublicKeysFromMirrorNodeKey(
      contractInfo.admin_key,
    );

    const findByPublicKey = (publicKey: string) =>
      api.kms.findByPublicKey(publicKey);

    const adminKeyRefIds = matchPublicKeysToKmsRefIds(
      adminKeysExtracted.publicKeys,
      findByPublicKey,
    );

    const contractData: ContractData = {
      contractId,
      name,
      contractEvmAddress: normalizedContractEvmAddress,
      adminKeyRefIds,
      adminKeyThreshold: adminKeysExtracted.threshold,
      network,
      memo: contractInfo.memo || undefined,
      verified,
    };

    this.contractState.saveContract(contractKey, contractData);

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
  const contractState = new ContractStateServiceImpl(
    args.api.state,
    args.api.logger,
  );
  return new ImportContractCommand(contractState).execute(args);
}
