/**
 * Delete Contract Command Handler
 * Removes contract from state and optionally submits ContractDeleteTransaction on Hedera
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ContractInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';
import type { ContractDeleteInput } from './input';
import type { ContractDeleteOutput } from './output';
import type {
  ContractDeleteBuildTransactionResult,
  ContractDeleteExecuteTransactionResult,
  ContractDeleteNormalisedParams,
  ContractDeleteSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType } from '@/core/types/shared.types';
import { ensureEvmAddress0xPrefix } from '@/core/utils/evm-address';
import {
  extractPublicKeysFromMirrorNodeKey,
  getEffectiveKeyRequirement,
} from '@/core/utils/extract-public-keys';
import { composeKey } from '@/core/utils/key-composer';
import { ContractHelper } from '@/plugins/contract/contract-helper';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { ContractDeleteInputSchema } from './input';

export const CONTRACT_DELETE_COMMAND_NAME = 'contract_delete';

export class DeleteContractCommand extends BaseTransactionCommand<
  ContractDeleteNormalisedParams,
  ContractDeleteBuildTransactionResult,
  ContractDeleteSignTransactionResult,
  ContractDeleteExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_DELETE_COMMAND_NAME);
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const input = ContractDeleteInputSchema.parse(args.args);
    if (input.stateOnly) {
      return this.executeStateOnlyDelete(args, input);
    }
    return await super.execute(args);
  }

  private async executeStateOnlyDelete(
    args: CommandHandlerArgs,
    parsedInput: ContractDeleteInput,
  ): Promise<CommandResult> {
    const { api } = args;
    const resolved = this.resolveContractFromState(args, parsedInput);
    const contractHelper = new ContractHelper(api.state, api.logger, api.alias);
    const removedAliases = contractHelper.removeContractFromLocalState(
      resolved.contractToDelete,
      resolved.network,
    );

    const outputData: ContractDeleteOutput = {
      deletedContract: {
        contractId: resolved.contractToDelete.contractId,
        name: resolved.contractToDelete.name,
      },
      network: resolved.network,
      removedAliases,
      stateOnly: true,
    };

    return { result: outputData };
  }

  private resolveContractRef(
    contractRef: string,
    network: SupportedNetwork,
    aliasService: AliasService,
  ): { resolvedEntityId: string; stateKey: string } {
    if (EntityIdSchema.safeParse(contractRef).success) {
      return {
        resolvedEntityId: contractRef,
        stateKey: composeKey(network, contractRef),
      };
    }
    const aliasRecord = aliasService.resolveOrThrow(
      contractRef,
      AliasType.Contract,
      network,
    );
    if (!aliasRecord.entityId) {
      throw new NotFoundError(
        `Contract "${contractRef}" has no associated contract ID`,
        { context: { alias: contractRef, network } },
      );
    }
    return {
      resolvedEntityId: aliasRecord.entityId,
      stateKey: composeKey(network, aliasRecord.entityId),
    };
  }

  private resolveContractFromState(
    args: CommandHandlerArgs,
    parsedInput?: ContractDeleteInput,
  ): {
    contractToDelete: ContractData;
    network: SupportedNetwork;
    stateKey: string;
    contractRef: string;
  } {
    const { api, logger } = args;
    const contractState = new ZustandContractStateHelper(api.state, logger);
    const validArgs = parsedInput ?? ContractDeleteInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const network = api.network.getCurrentNetwork();
    const { stateKey } = this.resolveContractRef(
      contractRef,
      network,
      api.alias,
    );

    const contractToDelete = contractState.getContract(stateKey);
    if (!contractToDelete) {
      throw new NotFoundError(
        `Contract with identifier '${contractRef}' not found`,
      );
    }

    return { contractToDelete, network, stateKey, contractRef };
  }

  private async resolveContractForNetworkDelete(
    args: CommandHandlerArgs,
    parsedInput?: ContractDeleteInput,
  ): Promise<{
    contractToDelete: ContractData;
    network: SupportedNetwork;
    stateKey: string;
    contractRef: string;
    mirrorContractInfo: ContractInfo | null;
  }> {
    const { api, logger } = args;
    const contractState = new ZustandContractStateHelper(api.state, logger);
    const validArgs = parsedInput ?? ContractDeleteInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const network = api.network.getCurrentNetwork();
    const { resolvedEntityId, stateKey } = this.resolveContractRef(
      contractRef,
      network,
      api.alias,
    );

    const storedContract = contractState.getContract(stateKey);
    if (storedContract) {
      return {
        contractToDelete: storedContract,
        network,
        stateKey,
        contractRef,
        mirrorContractInfo: null,
      };
    }

    const contractInfo = await api.mirror.getContractInfo(resolvedEntityId);

    const contractEvmAddress = contractInfo.evm_address;
    if (!contractEvmAddress) {
      throw new NotFoundError(
        `Could not resolve EVM address for contract '${contractRef}' from mirror`,
      );
    }

    const contractToDelete: ContractData = {
      contractId: contractInfo.contract_id,
      contractEvmAddress: ensureEvmAddress0xPrefix(contractEvmAddress),
      network,
      adminKeyRefIds: [],
      adminKeyThreshold: 0,
      memo: contractInfo.memo || undefined,
    };

    logger.info(
      `Contract not in local state; using mirror info for ${contractToDelete.contractId}`,
    );

    return {
      contractToDelete,
      network,
      stateKey,
      contractRef,
      mirrorContractInfo: contractInfo,
    };
  }

  private resolveTransferAccountId(
    transferRef: string,
    network: SupportedNetwork,
    aliasService: AliasService,
  ): string {
    if (EntityIdSchema.safeParse(transferRef).success) {
      return transferRef;
    }
    const alias = aliasService.resolveOrThrow(
      transferRef,
      AliasType.Account,
      network,
    );
    if (!alias.entityId) {
      throw new NotFoundError(
        `Account "${transferRef}" has no associated account ID`,
        { context: { alias: transferRef, network } },
      );
    }
    return alias.entityId;
  }

  private resolveTransferContractId(
    transferRef: string,
    network: SupportedNetwork,
    aliasService: AliasService,
  ): string {
    if (EntityIdSchema.safeParse(transferRef).success) {
      return transferRef;
    }
    const alias = aliasService.resolveOrThrow(
      transferRef,
      AliasType.Contract,
      network,
    );
    if (!alias.entityId) {
      throw new NotFoundError(
        `Contract "${transferRef}" has no associated contract ID`,
        { context: { alias: transferRef, network } },
      );
    }
    return alias.entityId;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractDeleteNormalisedParams> {
    const validArgs = ContractDeleteInputSchema.parse(args.args);
    const resolved = await this.resolveContractForNetworkDelete(
      args,
      validArgs,
    );
    const { api } = args;
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const contractInfo =
      resolved.mirrorContractInfo ??
      (await api.mirror.getContractInfo(resolved.contractToDelete.contractId));

    if (contractInfo.deleted) {
      throw new ValidationError(
        'This contract is already marked deleted on the network',
        {
          context: { contractId: contractInfo.contract_id },
        },
      );
    }

    const contractEvmAddress = contractInfo.evm_address;
    if (!contractEvmAddress) {
      throw new NotFoundError(
        `Could not resolve EVM address for contract '${resolved.contractRef}' from mirror`,
      );
    }

    const extracted = extractPublicKeysFromMirrorNodeKey(
      contractInfo.admin_key,
    );
    const requirement = getEffectiveKeyRequirement(extracted);
    if (requirement.publicKeys.length === 0) {
      throw new ValidationError(
        'This contract has no admin key on Hedera. On-network deletion is not possible. You can remove it from local CLI state only using --state-only flag.',
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
      signingKeyRefIds = adminKeys.map((adminKey) => adminKey.keyRefId);
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
          'Not enough admin key(s) not found in key manager for this contract. Provide --admin-key.',
          { context: { contractId: contractInfo.contract_id } },
        );
      }
      signingKeyRefIds = refIds;
    }

    const contractToDelete: ContractData = {
      ...resolved.contractToDelete,
      contractEvmAddress: ensureEvmAddress0xPrefix(contractEvmAddress),
      adminKeyRefIds: signingKeyRefIds,
      adminKeyThreshold: requirement.requiredSignatures,
      memo: contractInfo.memo || undefined,
    };

    let transferAccountId: string | undefined;
    let transferContractId: string | undefined;

    if (validArgs.transferId) {
      transferAccountId = this.resolveTransferAccountId(
        validArgs.transferId,
        resolved.network,
        api.alias,
      );
    }
    if (validArgs.transferContractId) {
      transferContractId = this.resolveTransferContractId(
        validArgs.transferContractId,
        resolved.network,
        api.alias,
      );
    }

    if (transferAccountId === contractToDelete.contractId) {
      throw new ValidationError(
        'Transfer account must be different from the contract being deleted',
      );
    }
    if (transferContractId === contractToDelete.contractId) {
      throw new ValidationError(
        'Transfer target contract must be different from the contract being deleted',
      );
    }

    return {
      network: resolved.network,
      stateKey: resolved.stateKey,
      contractRef: resolved.contractRef,
      contractToDelete,
      transferAccountId,
      transferContractId,
      signingKeyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractDeleteNormalisedParams,
  ): Promise<ContractDeleteBuildTransactionResult> {
    const { api } = args;
    return api.contract.deleteContract({
      contractId: normalisedParams.contractToDelete.contractId,
      transferAccountId: normalisedParams.transferAccountId,
      transferContractId: normalisedParams.transferContractId,
    });
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractDeleteNormalisedParams,
    buildTransactionResult: ContractDeleteBuildTransactionResult,
  ): Promise<ContractDeleteSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.signingKeyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: ContractDeleteNormalisedParams,
    _buildTransactionResult: ContractDeleteBuildTransactionResult,
    signTransactionResult: ContractDeleteSignTransactionResult,
  ): Promise<ContractDeleteExecuteTransactionResult> {
    const { api } = args;
    return api.txExecute.execute(signTransactionResult.signedTransaction);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: ContractDeleteNormalisedParams,
    _buildTransactionResult: ContractDeleteBuildTransactionResult,
    _signTransactionResult: ContractDeleteSignTransactionResult,
    executeTransactionResult: ContractDeleteExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api } = args;

    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to delete contract (txId: ${executeTransactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: executeTransactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }

    const contractHelper = new ContractHelper(api.state, api.logger, api.alias);
    const removedAliases = contractHelper.removeContractFromLocalState(
      normalisedParams.contractToDelete,
      normalisedParams.network,
    );

    const outputData: ContractDeleteOutput = {
      deletedContract: {
        contractId: normalisedParams.contractToDelete.contractId,
        name: normalisedParams.contractToDelete.name,
      },
      removedAliases,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId,
      stateOnly: false,
    };

    return { result: outputData };
  }
}

export async function contractDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new DeleteContractCommand().execute(args);
}
