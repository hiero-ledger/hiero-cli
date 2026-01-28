import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { ContractCreateOutput } from '@/plugins/contract/commands/create/output';

import { ContractId, PublicKey } from '@hashgraph/sdk';
import path from 'path';

import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractCreateSchema } from '@/plugins/contract/commands/create/input';
import { readContractFile } from '@/plugins/contract/utils/contract-file-helpers';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

export async function createContract(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api, state } = args;
  const contractState = new ZustandContractStateHelper(state, logger);
  try {
    // Parse and validate args
    const validArgs = ContractCreateSchema.parse(args.args);
    const alias = validArgs.name;
    const filename = validArgs.file;
    const gas = validArgs.gas;
    const basePath = validArgs.basePath;
    const memo = validArgs.memo;
    const solidityVersion = validArgs.solidityVersion;
    const constructorParameters = validArgs.constructorParameters;
    const keyManagerArg = validArgs.keyManager;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(alias, network);
    const contractFilename = path.basename(filename);

    // Get keyManager from args or fallback to config
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const admin = await api.keyResolver.getOrInitKeyWithFallback(
      validArgs.adminKey,
      keyManager,
      ['contract:admin'],
    );

    const contractFileContent = await readContractFile(filename, logger);
    if (!contractFileContent) {
      throw new Error(`Could not read contract file ${validArgs.file}`);
    }
    const match = contractFileContent.match(/\bcontract\s+(\w+)/);
    const contractName = match ? match[1] : null;
    if (!contractName) {
      throw new Error(
        `Could not find contract name from the given file ${contractFilename}`,
      );
    }
    const compilationResult = await api.contractCompiler.compileContract({
      contractName: contractName,
      contractContent: contractFileContent,
      contractFilename: contractFilename,
      basePath: basePath,
      solidityVersion: solidityVersion,
    });

    const txSigners = [admin.keyRefId];

    const contractCreateFlowTx = api.contract.contractCreateFlowTransaction({
      bytecode: compilationResult.bytecode,
      gas: gas,
      abiDefinition: compilationResult.abiDefinition,
      constructorParameters: constructorParameters,
      adminKey: PublicKey.fromString(admin.publicKey),
      memo: memo,
    });
    const contractCreateFlowResult =
      await api.txExecution.signAndExecuteContractCreateFlowWith(
        contractCreateFlowTx.transaction,
        txSigners,
      );
    if (!contractCreateFlowResult.contractId) {
      throw new Error(
        `There was a problem with creating contract, no contract address present in the receipt`,
      );
    }
    const contractId = ContractId.fromString(
      contractCreateFlowResult.contractId,
    );
    if (SupportedNetwork.LOCALNET === network) {
      logger.warn(
        `Skipping contract verification as the selected network ${network} is not supported `,
      );
    } else {
      await api.contractVerifier.verifyContract({
        contractFilename: contractFilename,
        contractContent: contractFileContent,
        metadataContent: compilationResult.metadata,
        contractEvmAddress: contractId.toEvmAddress(),
      });
    }
    const contractData = {
      contractId: contractCreateFlowResult.contractId,
      contractName,
      contractEvmAddress: contractId.toEvmAddress(),
      adminPublicKey: admin.publicKey,
      network,
      memo,
    };
    contractState.saveContract(
      contractCreateFlowResult.contractId,
      contractData,
    );
    if (alias) {
      api.alias.register({
        alias,
        type: 'contract',
        network: network,
        entityId: contractCreateFlowResult.contractId,
        createdAt: contractCreateFlowResult.consensusTimestamp,
      });
    }

    const output: ContractCreateOutput = {
      contractId: contractCreateFlowResult.contractId,
      contractName: contractName,
      contractEvmAddress: `0x${contractId.toEvmAddress()}`,
      network: network,
      alias: alias,
      transactionId: contractCreateFlowResult.transactionId,
      adminPublicKey: admin.publicKey,
    };
    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create contract', error),
    };
  }
}
