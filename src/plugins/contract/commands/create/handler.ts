/**
 * Create Contract Command Handler
 * Manages smart contract creation by compiling, deploying and verification
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractVerificationResult } from '@/core/services/contract-verifier/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ContractCreateOutput } from './output';
import type {
  ContractCreateBuildTransactionResult,
  ContractCreateExecuteTransactionResult,
  ContractCreateNormalisedParams,
  ContractCreateSignTransactionResult,
} from './types';

import { ContractId, PublicKey } from '@hashgraph/sdk';
import path from 'path';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import {
  DEFAULT_CONSTRUCTOR_PARAMS,
  getDefaultContractFilePath,
  getRepositoryBasePath,
  readContractFile,
  readContractNameFromFileContent,
} from '@/plugins/contract/utils/contract-file-helpers';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractCreateSchema } from './input';

export class CreateContractCommand extends BaseTransactionCommand<
  ContractCreateNormalisedParams,
  ContractCreateBuildTransactionResult,
  ContractCreateSignTransactionResult,
  ContractCreateExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractCreateNormalisedParams> {
    const { api, logger } = args;

    const validArgs = ContractCreateSchema.parse(args.args);
    const alias = validArgs.name;
    const defaultTemplate = validArgs.defaultTemplate;
    const gas = validArgs.gas;
    let basePath = validArgs.basePath;
    const memo = validArgs.memo;
    const solidityVersion = validArgs.solidityVersion;
    const keyManagerArg = validArgs.keyManager;
    const network = api.network.getCurrentNetwork();
    let constructorParameters = validArgs.constructorParameters;

    if (defaultTemplate && constructorParameters.length === 0) {
      constructorParameters = DEFAULT_CONSTRUCTOR_PARAMS[defaultTemplate];
    }

    let filename: string;
    if (defaultTemplate) {
      filename = getDefaultContractFilePath(defaultTemplate);
      basePath = getRepositoryBasePath();
    } else {
      filename = validArgs.file!;
      if (!basePath) {
        basePath = process.cwd();
      }
    }

    api.alias.availableOrThrow(alias, network);

  const keyManager =
    keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const admin = validArgs.adminKey
      ? await api.keyResolver.resolveSigningKey(
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

    return {
      alias,
      defaultTemplate,
      gas,
      basePath,
      memo,
      solidityVersion,
      constructorParameters,
      keyManager,
      filename,
      contractName,
      contractFileContent,
      contractBasename,
      admin: admin
        ? { keyRefId: admin.keyRefId, publicKey: admin.publicKey }
        : undefined,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractCreateNormalisedParams,
  ): Promise<ContractCreateBuildTransactionResult> {
    const { api } = args;

    const compilationResult = await api.contractCompiler.compileContract({
      contractName: normalisedParams.contractName,
      contractContent: normalisedParams.contractFileContent,
      contractFilename: normalisedParams.filename,
      basePath: normalisedParams.basePath,
      solidityVersion: normalisedParams.solidityVersion,
    });

    const adminPublicKey = normalisedParams.admin
      ? PublicKey.fromString(normalisedParams.admin.publicKey)
      : undefined;

    const contractCreateFlowTx = api.contract.contractCreateFlowTransaction({
      bytecode: compilationResult.bytecode,
      gas: normalisedParams.gas,
      abiDefinition: compilationResult.abiDefinition,
      constructorParameters: normalisedParams.constructorParameters,
      adminKey: adminPublicKey,
      memo: normalisedParams.memo,
    });

    return { compilationResult, contractCreateFlowTx };
  }

  async signTransaction(
    _args: CommandHandlerArgs,
    normalisedParams: ContractCreateNormalisedParams,
    buildTransactionResult: ContractCreateBuildTransactionResult,
  ): Promise<ContractCreateSignTransactionResult> {
    const { api } = _args;

    const txSigners = normalisedParams.admin
      ? [normalisedParams.admin.keyRefId]
      : [];
    const signedFlow = api.txSign.signContractCreateFlow(
      buildTransactionResult.contractCreateFlowTx.transaction,
      txSigners,
    );

    return { signedFlow };
  }

  async executeTransaction(
    _args: CommandHandlerArgs,
    _normalisedParams: ContractCreateNormalisedParams,
    _buildTransactionResult: ContractCreateBuildTransactionResult,
    signTransactionResult: ContractCreateSignTransactionResult,
  ): Promise<ContractCreateExecuteTransactionResult> {
    const { api } = _args;

    return api.txExecute.executeContractCreateFlow(
      signTransactionResult.signedFlow,
    );
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: ContractCreateNormalisedParams,
    buildTransactionResult: ContractCreateBuildTransactionResult,
    _signTransactionResult: ContractCreateSignTransactionResult,
    executeTransactionResult: ContractCreateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;

    if (!executeTransactionResult.contractId) {
      throw new StateError('Transaction completed but no contractId returned', {
        context: { transactionId: executeTransactionResult.transactionId },
      });
    }

    const contractId = ContractId.fromString(
      executeTransactionResult.contractId,
    );
    let verificationResult: ContractVerificationResult = { success: false };

    if (SupportedNetwork.LOCALNET === normalisedParams.network) {
      logger.warn(
        `Skipping contract verification as the selected network ${normalisedParams.network} is not supported `,
      );
    } else {
      verificationResult = await api.contractVerifier.verifyContract({
        contractFile: normalisedParams.filename,
        metadataContent: buildTransactionResult.compilationResult.metadata,
        contractEvmAddress: contractId.toEvmAddress(),
      });
      if (!verificationResult.success && verificationResult.errorMessage) {
        logger.warn(
          `Contract verification failed: ${verificationResult.errorMessage}`,
        );
      }
    }

    const contractEvmAddress = `0x${contractId.toEvmAddress()}`;
    const contractState = new ZustandContractStateHelper(api.state, logger);

    const contractData = {
      contractId: executeTransactionResult.contractId,
      alias: normalisedParams.alias,
      contractName: normalisedParams.contractName,
      contractEvmAddress,
      adminPublicKey: normalisedParams.admin?.publicKey,
      network: normalisedParams.network,
      memo: normalisedParams.memo,
      verified: verificationResult.success,
    };
    const contractKey = composeKey(
      normalisedParams.network,
      executeTransactionResult.contractId,
    );
    contractState.saveContract(contractKey, contractData);

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Contract,
        network: normalisedParams.network,
        entityId: executeTransactionResult.contractId,
        createdAt: executeTransactionResult.consensusTimestamp,
      });
    }

    const output: ContractCreateOutput = {
      contractId: executeTransactionResult.contractId,
      contractName: normalisedParams.contractName,
      contractEvmAddress,
      network: normalisedParams.network,
      alias: normalisedParams.alias,
      transactionId: executeTransactionResult.transactionId,
      adminPublicKey: normalisedParams.admin?.publicKey,
      verified: verificationResult.success,
    };

    return { result: output };
  }
}

export async function createContract(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CreateContractCommand().execute(args);
}
