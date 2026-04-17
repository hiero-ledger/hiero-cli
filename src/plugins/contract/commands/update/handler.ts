/**
 * Update Contract Command Handler
 * Updates smart contract properties on Hedera network
 */
import type { Key } from '@hashgraph/sdk';
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ContractData } from '@/plugins/contract/schema';
import type { ContractUpdateOutput } from './output';
import type {
  ContractUpdateBuildTransactionResult,
  ContractUpdateExecuteTransactionResult,
  ContractUpdateNormalisedParams,
  ContractUpdateSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { ensureEvmAddress0xPrefix } from '@/core/utils/evm-address';
import {
  extractPublicKeysFromMirrorNodeKey,
  getEffectiveKeyRequirement,
} from '@/core/utils/extract-public-keys';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/core/utils/keys-to-hedera-key';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractUpdateInputSchema } from './input';

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
      const contractEvmAddress = contractInfo.evm_address;
      if (!contractEvmAddress) {
        throw new NotFoundError(
          `Could not resolve EVM address for contract '${contractId}' from mirror`,
        );
      }
      storedContract = {
        contractId,
        contractEvmAddress: ensureEvmAddress0xPrefix(contractEvmAddress),
        network,
        adminKeyRefIds: [],
        adminKeyThreshold: 0,
        memo: contractInfo.memo || undefined,
      };
      logger.info(
        `Contract not in local state; using mirror info for ${storedContract.contractId}`,
      );
    }

    const extracted = extractPublicKeysFromMirrorNodeKey(
      contractInfo.admin_key,
    );
    const requirement = getEffectiveKeyRequirement(extracted);

    if (requirement.publicKeys.length === 0) {
      throw new ValidationError(
        'This contract has no admin key on Hedera. On-network update is not possible.',
      );
    }

    let signingKeyRefIds: string[];

    if (validArgs.adminKey.length > 0) {
      const adminKeys = await Promise.all(
        validArgs.adminKey.map((cred) =>
          api.keyResolver.resolveSigningKey(cred, keyManager, false, [
            'contract:admin',
          ]),
        ),
      );
      signingKeyRefIds = adminKeys.map((k) => k.keyRefId);
    } else {
      const refIds: string[] = [];
      const usedRefIds = new Set<string>();
      for (const publicKey of requirement.publicKeys) {
        const kmsRecord = api.kms.findByPublicKey(publicKey);
        if (kmsRecord && !usedRefIds.has(kmsRecord.keyRefId)) {
          usedRefIds.add(kmsRecord.keyRefId);
          refIds.push(kmsRecord.keyRefId);
          if (refIds.length >= requirement.requiredSignatures) {
            break;
          }
        }
      }
      if (refIds.length < requirement.requiredSignatures) {
        throw new ValidationError(
          'Not enough admin key(s) found in key manager for this contract. Provide --admin-key.',
          { context: { contractId: contractInfo.contract_id } },
        );
      }
      signingKeyRefIds = refIds;
    }
    let newAdminKeys: ResolvedPublicKey[] | undefined;
    if (validArgs.newAdminKey.length > 0) {
      newAdminKeys = await Promise.all(
        validArgs.newAdminKey.map((cred) =>
          api.keyResolver.getPublicKey(cred, keyManager, false, [
            'contract:admin',
          ]),
        ),
      );
      for (const newAdminKey of newAdminKeys) {
        if (!api.kms.hasPrivateKey(newAdminKey.keyRefId)) {
          throw new ValidationError('New admin key has no private key in KMS', {
            context: { keyRefId: newAdminKey.keyRefId },
          });
        }
      }
      newAdminKeys
        .filter((adminKey) => !signingKeyRefIds.includes(adminKey.keyRefId))
        .forEach((adminKey) => signingKeyRefIds.push(adminKey.keyRefId));
    }

    // Build updated fields list
    const updatedFields: string[] = [];
    if (validArgs.newAdminKey.length > 0) updatedFields.push('adminKey');
    if (validArgs.memo !== undefined) updatedFields.push('memo');
    if (validArgs.autoRenewPeriod !== undefined)
      updatedFields.push('autoRenewPeriod');
    if (validArgs.autoRenewAccountId !== undefined)
      updatedFields.push('autoRenewAccountId');
    if (validArgs.maxAutomaticTokenAssociations !== undefined)
      updatedFields.push('maxAutomaticTokenAssociations');
    if (validArgs.stakedAccountId !== undefined)
      updatedFields.push('stakedAccountId');
    if (validArgs.stakedNodeId !== undefined)
      updatedFields.push('stakedNodeId');
    if (validArgs.declineStakingReward !== undefined)
      updatedFields.push('declineStakingReward');

    return {
      network,
      stateKey,
      contractId: storedContract.contractId,
      contractToUpdate: storedContract,
      newAdminKeys,
      newAdminKeyThreshold: validArgs.newAdminKeyThreshold,
      signingKeyRefIds: signingKeyRefIds,
      memo: validArgs.memo,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      autoRenewAccountId: validArgs.autoRenewAccountId,
      maxAutomaticTokenAssociations: validArgs.maxAutomaticTokenAssociations,
      stakedAccountId: validArgs.stakedAccountId,
      stakedNodeId: validArgs.stakedNodeId,
      declineStakingReward: validArgs.declineStakingReward,
      keyRefIds: signingKeyRefIds,
      updatedFields,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractUpdateNormalisedParams,
  ): Promise<ContractUpdateBuildTransactionResult> {
    const { api } = args;
    let adminKey: Key | undefined;
    if (normalisedParams.newAdminKeys !== undefined) {
      adminKey = toHederaKey(
        normalisedParams.newAdminKeys,
        normalisedParams.newAdminKeyThreshold ??
          normalisedParams.newAdminKeys.length,
      );
    }
    return api.contract.updateContract({
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
    });
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
}

export async function contractUpdate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new UpdateContractCommand().execute(args);
}
