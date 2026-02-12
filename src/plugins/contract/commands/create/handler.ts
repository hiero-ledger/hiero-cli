import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { ContractVerificationResult } from '@/core/services/contract-verifier/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { ContractCreateOutput } from '@/plugins/contract/commands/create/output';

import { ContractId, PublicKey } from '@hashgraph/sdk';
import path from 'path';

import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractCreateSchema } from '@/plugins/contract/commands/create/input';
import {
  readContractFile,
  readContractNameFromFileContent,
} from '@/plugins/contract/utils/contract-file-helpers';
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
    let basePath = validArgs.basePath;
    const memo = validArgs.memo;
    const solidityVersion = validArgs.solidityVersion;
    const constructorParameters = validArgs.constructorParameters;
    const keyManagerArg = validArgs.keyManager;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(alias, network);
    if (!basePath) {
      // Default to the current working directory when basePath is not provided
      basePath = process.cwd();
    }

    // Get keyManager from args or fallback to config
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const admin = validArgs.adminKey
      ? await api.keyResolver.getOrInitKeyWithFallback(
          validArgs.adminKey,
          keyManager,
          ['contract:admin'],
        )
      : undefined;

    if (!admin) {
      logger.warn(
        `Admin key not specified. Smart contract will lack admin key set`,
      );
    }

    const contractBasename = path.basename(filename);
    const contractFileContent = readContractFile(filename);
    const contractName = readContractNameFromFileContent(
      contractBasename,
      contractFileContent,
    );

    const compilationResult = await api.contractCompiler.compileContract({
      contractName: contractName,
      contractContent: contractFileContent,
      contractFilename: filename,
      basePath: basePath,
      solidityVersion: solidityVersion,
    });

    const txSigners = admin ? [admin.keyRefId] : [];
    const adminPublicKey = admin ? admin.publicKey : undefined;

    const contractCreateFlowTx = api.contract.contractCreateFlowTransaction({
      bytecode: compilationResult.bytecode,
      gas: gas,
      abiDefinition: compilationResult.abiDefinition,
      constructorParameters: constructorParameters,
      adminKey: adminPublicKey
        ? PublicKey.fromString(adminPublicKey)
        : undefined,
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
    let verificationResult: ContractVerificationResult = {
      success: false,
    };
    if (SupportedNetwork.LOCALNET === network) {
      logger.warn(
        `Skipping contract verification as the selected network ${network} is not supported `,
      );
    } else {
      verificationResult = await api.contractVerifier.verifyContract({
        contractFile: filename,
        metadataContent: compilationResult.metadata,
        contractEvmAddress: contractId.toEvmAddress(),
      });
      if (!verificationResult.success && verificationResult.errorMessage) {
        logger.warn(
          `Contract verification failed: ${verificationResult.errorMessage}`,
        );
      }
    }
    const contractEvmAddress = `0x${contractId.toEvmAddress()}`;
    const contractData = {
      contractId: contractCreateFlowResult.contractId,
      contractName,
      contractEvmAddress,
      adminPublicKey,
      network,
      memo,
      verified: verificationResult.success,
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
      contractEvmAddress,
      network,
      alias: alias,
      transactionId: contractCreateFlowResult.transactionId,
      adminPublicKey: adminPublicKey,
      verified: verificationResult.success,
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
