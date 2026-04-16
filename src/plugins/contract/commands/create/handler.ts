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

import { ContractId } from '@hashgraph/sdk';
import path from 'path';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import {
  DEFAULT_CONSTRUCTOR_PARAMS,
  getDefaultContractFilePath,
  getRepositoryBasePath,
  readContractFile,
  readContractNameFromFileContent,
} from '@/plugins/contract/utils/contract-file-helpers';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractCreateSchema } from './input';

export const CONTRACT_CREATE_COMMAND_NAME = 'contract_create';

export class CreateContractCommand extends BaseTransactionCommand<
  ContractCreateNormalisedParams,
  ContractCreateBuildTransactionResult,
  ContractCreateSignTransactionResult,
  ContractCreateExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_CREATE_COMMAND_NAME);
  }

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
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const adminKeys = await Promise.all(
      validArgs.adminKeys.map((cred) =>
        api.keyResolver.resolveSigningKey(cred, keyManager, false, [
          'contract:admin',
        ]),
      ),
    );

    const adminKeyThreshold = validArgs.adminKeyThreshold ?? adminKeys.length;

    if (adminKeys.length === 0) {
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

    const initialBalanceRaw =
      validArgs.initialBalance !== undefined
        ? processBalanceInput(validArgs.initialBalance, HBAR_DECIMALS)
        : undefined;

    const autoRenewAccount = validArgs.autoRenewAccountId
      ? await api.identityResolution.resolveAccount({
          accountReference: validArgs.autoRenewAccountId.value,
          type: validArgs.autoRenewAccountId.type,
          network,
        })
      : undefined;

    const stakedAccount = validArgs.stakedAccountId
      ? await api.identityResolution.resolveAccount({
          accountReference: validArgs.stakedAccountId.value,
          type: validArgs.stakedAccountId.type,
          network,
        })
      : undefined;

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
      adminKeys,
      adminKeyThreshold,
      network,
      initialBalanceRaw,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      autoRenewAccountId: autoRenewAccount?.accountId,
      maxAutomaticTokenAssociations: validArgs.maxAutomaticTokenAssociations,
      stakedAccountId: stakedAccount?.accountId,
      stakedNodeId: validArgs.stakedNodeId,
      declineStakingReward: validArgs.declineStakingReward,
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

    const adminKey = toHederaKey(
      normalisedParams.adminKeys,
      normalisedParams.adminKeyThreshold,
    );

    const contractCreateFlowTx = api.contract.contractCreateFlowTransaction({
      bytecode: compilationResult.bytecode,
      gas: normalisedParams.gas,
      abiDefinition: compilationResult.abiDefinition,
      constructorParameters: normalisedParams.constructorParameters,
      adminKey,
      memo: normalisedParams.memo,
      initialBalanceRaw: normalisedParams.initialBalanceRaw,
      autoRenewPeriod: normalisedParams.autoRenewPeriod,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      maxAutomaticTokenAssociations:
        normalisedParams.maxAutomaticTokenAssociations,
      stakedAccountId: normalisedParams.stakedAccountId,
      stakedNodeId: normalisedParams.stakedNodeId,
      declineStakingReward: normalisedParams.declineStakingReward,
    });

    return { compilationResult, contractCreateFlowTx };
  }

  async signTransaction(
    _args: CommandHandlerArgs,
    normalisedParams: ContractCreateNormalisedParams,
    buildTransactionResult: ContractCreateBuildTransactionResult,
  ): Promise<ContractCreateSignTransactionResult> {
    const { api } = _args;

    const adminKeysCount = normalisedParams.adminKeys.length;
    const txSigners =
      adminKeysCount > 0
        ? normalisedParams.adminKeys
            .slice(0, normalisedParams.adminKeyThreshold)
            .map((k) => k.keyRefId)
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
      name: normalisedParams.alias,
      contractEvmAddress,
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
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

    const adminKeyCount = normalisedParams.adminKeys.length;

    const output: ContractCreateOutput = {
      contractId: executeTransactionResult.contractId,
      contractName: normalisedParams.contractName,
      contractEvmAddress,
      network: normalisedParams.network,
      name: normalisedParams.alias,
      transactionId: executeTransactionResult.transactionId,
      adminKeyPresent: adminKeyCount > 0,
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
      adminKeyCount: adminKeyCount > 1 ? adminKeyCount : undefined,
      verified: verificationResult.success,
    };

    return { result: output };
  }
}

export async function contractCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CreateContractCommand().execute(args);
}
