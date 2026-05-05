/**
 * Update Contract Command Handler
 * Updates smart contract properties on Hedera network
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ContractInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';
import type { ContractUpdateOutput } from './output';
import type {
  ContractUpdateBuildTransactionResult,
  ContractUpdateExecuteTransactionResult,
  ContractUpdateFields,
  ContractUpdateNormalisedParams,
  ContractUpdateSignTransactionResult,
} from './types';

import { AliasType } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { ensureEvmAddress0xPrefix } from '@/core/utils/evm-address';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractUpdateInputSchema } from './input';
import { NULL_TOKEN } from '@/core/shared/constants';

export const CONTRACT_UPDATE_COMMAND_NAME = 'contract_update';

export class UpdateContractCommand extends BaseTransactionCommand<
  ContractUpdateNormalisedParams,
  ContractUpdateBuildTransactionResult,
  ContractUpdateSignTransactionResult,
  ContractUpdateExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_UPDATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractUpdateNormalisedParams> {
    const { api, logger } = args;

    const validArgs = ContractUpdateInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const contractRef = validArgs.contract;
    const autoRenewAccountId =
      validArgs.autoRenewAccountId === NULL_TOKEN
        ? null
        : validArgs.autoRenewAccountId;
    const { entityIdOrEvmAddress } =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        aliasType: AliasType.Contract,
        network,
      });
    // Fetch mirror node info for admin key resolution
    const contractInfo = await api.mirror.getContractInfo(entityIdOrEvmAddress);
    const contractId = contractInfo.contract_id;
    const stateKey = composeKey(network, contractId);

    const contractState = new ZustandContractStateHelper(api.state, logger);
    let storedContract = contractState.getContract(stateKey);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    if (contractInfo.deleted) {
      throw new ValidationError(
        'This contract is already marked deleted on the network',
        { context: { contractId: contractInfo.contract_id } },
      );
    }

    if (!storedContract) {
      storedContract = this.buildContractFromMirror(contractInfo, contractId, network);
      logger.info(
        `Contract not in local state; using mirror info for ${storedContract.contractId}`,
      );
    }

    const signingKeyRefIds = new Set<string>();

    const adminKeyResult = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: contractInfo.admin_key,
      explicitCredentials: validArgs.adminKey,
      keyManager,
      signingKeyLabels: ['contract:admin'],
      emptyMirrorRoleKeyMessage: 'This contract has no admin key on Hedera.',
      insufficientKmsMatchesMessage:
        'Not enough admin key(s) found in key manager for this contract. Provide --admin-key.',
      validationErrorOptions: {
        context: { contractId: contractInfo.contract_id },
      },
    });
    const adminKeyRefIds = adminKeyResult.keyRefIds;
    adminKeyRefIds.forEach((adminKey) => {
      signingKeyRefIds.add(adminKey);
    });
    const newAdminKeys = await Promise.all(
      validArgs.newAdminKey.map(async (adminKey) => {
        const resolvedAdminKey = await api.keyResolver.resolveSigningKey(
          adminKey,
          keyManager,
          false,
          ['contract:admin'],
        );
        signingKeyRefIds.add(resolvedAdminKey.keyRefId);
        return resolvedAdminKey;
      }),
    );

    const updatedFields = this.buildUpdatedFields(validArgs);

    return {
      network,
      stateKey,
      contractId: storedContract.contractId,
      contractToUpdate: storedContract,
      newAdminKeys,
      newAdminKeyThreshold: validArgs.newAdminKeyThreshold,
      signingKeyRefIds: [...signingKeyRefIds],
      memo: validArgs.memo,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      autoRenewAccountId: autoRenewAccountId,
      maxAutomaticTokenAssociations: validArgs.maxAutomaticTokenAssociations,
      stakedAccountId: validArgs.stakedAccountId,
      stakedNodeId: validArgs.stakedNodeId,
      declineStakingReward: validArgs.declineStakingReward,
      expirationTime: validArgs.expirationTime,
      keyRefIds: [...signingKeyRefIds],
      updatedFields,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractUpdateNormalisedParams,
  ): Promise<ContractUpdateBuildTransactionResult> {
    const { api } = args;
    const adminKey = toHederaKey(
      normalisedParams.newAdminKeys,
      normalisedParams.newAdminKeyThreshold ??
        normalisedParams.newAdminKeys.length,
    );
    const updateResult = api.contract.updateContract({
      contractId: normalisedParams.contractId,
      adminKey: adminKey,
      memo: normalisedParams.memo,
      autoRenewPeriod: normalisedParams.autoRenewPeriod,
      autoRenewAccountId: normalisedParams.autoRenewAccountId,
      maxAutomaticTokenAssociations:
        normalisedParams.maxAutomaticTokenAssociations,
      stakedAccountId: normalisedParams.stakedAccountId,
      stakedNodeId: normalisedParams.stakedNodeId,
      declineStakingReward: normalisedParams.declineStakingReward,
      expirationTime: normalisedParams.expirationTime
        ? new Date(normalisedParams.expirationTime)
        : undefined,
    });
    return {
      transaction: updateResult.transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractUpdateNormalisedParams,
    buildTransactionResult: ContractUpdateBuildTransactionResult,
  ): Promise<ContractUpdateSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.signingKeyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractUpdateNormalisedParams,
    _buildTransactionResult: ContractUpdateBuildTransactionResult,
    signTransactionResult: ContractUpdateSignTransactionResult,
  ): Promise<ContractUpdateExecuteTransactionResult> {
    const { api } = args;
    const executeTransactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to update contract (txId: ${executeTransactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: executeTransactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }
    return executeTransactionResult;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: ContractUpdateNormalisedParams,
    _buildTransactionResult: ContractUpdateBuildTransactionResult,
    _signTransactionResult: ContractUpdateSignTransactionResult,
    executeTransactionResult: ContractUpdateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const contractState = new ZustandContractStateHelper(api.state, logger);
    const existingContract = contractState.getContract(
      normalisedParams.stateKey,
    );

    if (existingContract) {
      const updatedAdminKeyRefIds = normalisedParams.newAdminKeys
        ? normalisedParams.newAdminKeys.map((k) => k.keyRefId)
        : existingContract.adminKeyRefIds;
      const updatedAdminKeyThreshold = normalisedParams.newAdminKeys
        ? (normalisedParams.newAdminKeyThreshold ??
          normalisedParams.newAdminKeys.length)
        : existingContract.adminKeyThreshold;
      const updatedContract: ContractData = {
        ...existingContract,
        memo:
          normalisedParams.memo !== undefined
            ? (normalisedParams.memo ?? undefined)
            : existingContract.memo,
        adminKeyRefIds: updatedAdminKeyRefIds,
        adminKeyThreshold: updatedAdminKeyThreshold,
      };
      contractState.saveContract(normalisedParams.stateKey, updatedContract);
    }

    if (
      normalisedParams.newAdminKeys &&
      normalisedParams.newAdminKeys.length > 0
    ) {
      const oldAdminKeyRefIds =
        normalisedParams.contractToUpdate.adminKeyRefIds;
      const newAdminKeyRefId = normalisedParams.newAdminKeys[0].keyRefId;
      const contractAliases = api.alias
        .list()
        .filter(
          (a) =>
            a.entityId === normalisedParams.contractId &&
            a.keyRefId !== undefined &&
            oldAdminKeyRefIds.includes(a.keyRefId),
        );
      for (const contractAlias of contractAliases) {
        api.alias.remove(contractAlias.alias, contractAlias.network);
        api.alias.register({ ...contractAlias, keyRefId: newAdminKeyRefId });
      }
    }

    const outputData: ContractUpdateOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId ?? '',
      updatedFields: normalisedParams.updatedFields,
    };

    return { result: outputData };
  }

  private buildContractFromMirror(
    contractInfo: ContractInfo,
    contractId: string,
    network: SupportedNetwork,
  ): ContractData {
    const contractEvmAddress = contractInfo.evm_address;
    if (!contractEvmAddress) {
      throw new NotFoundError(
        `Could not resolve EVM address for contract '${contractId}' from mirror`,
      );
    }
    return {
      contractId,
      contractEvmAddress: ensureEvmAddress0xPrefix(contractEvmAddress),
      network,
      adminKeyRefIds: [],
      adminKeyThreshold: 0,
      memo: contractInfo.memo || undefined,
    };
  }

  private buildUpdatedFields(args: ContractUpdateFields): string[] {
    const updatedFields: string[] = [];
    if (args.newAdminKey.length > 0) updatedFields.push('adminKey');
    if (args.memo !== undefined) updatedFields.push('memo');
    if (args.autoRenewPeriod !== undefined)
      updatedFields.push('autoRenewPeriod');
    if (args.autoRenewAccountId !== undefined)
      updatedFields.push('autoRenewAccountId');
    if (args.maxAutomaticTokenAssociations !== undefined)
      updatedFields.push('maxAutomaticTokenAssociations');
    if (args.stakedAccountId !== undefined)
      updatedFields.push('stakedAccountId');
    if (args.stakedNodeId !== undefined) updatedFields.push('stakedNodeId');
    if (args.declineStakingReward !== undefined)
      updatedFields.push('declineStakingReward');
    if (args.expirationTime !== undefined) updatedFields.push('expirationTime');
    return updatedFields;
  }
}

export async function contractUpdate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new UpdateContractCommand().execute(args);
}
