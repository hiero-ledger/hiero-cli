/**
 * Delete Contract Command Handler
 * Removes contract from state and optionally submits ContractDeleteTransaction on Hedera
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
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
import { AliasType } from '@/core/services/alias/alias-service.interface';
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
    const resolved = await this.resolveContractFromState(args, parsedInput);
    const contractHelper = new ContractHelper(api.state, api.logger, api.alias);
    const removedAliases = contractHelper.removeContractFromLocalState(
      resolved.contractToDelete,
      resolved.network,
    );

    const outputData: ContractDeleteOutput = {
      deletedContract: {
        contractId: resolved.contractToDelete.contractId,
        contractName: resolved.contractToDelete.contractName,
      },
      network: resolved.network,
      removedAliases,
      stateOnly: true,
    };

    return { result: outputData };
  }

  private async resolveContractFromState(
    args: CommandHandlerArgs,
    parsedInput?: ContractDeleteInput,
  ): Promise<{
    contractToDelete: ContractData;
    network: SupportedNetwork;
    stateKey: string;
    contractRef: string;
  }> {
    const { api, logger } = args;
    const contractState = new ZustandContractStateHelper(api.state, logger);
    const validArgs = parsedInput ?? ContractDeleteInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const isEntityId = EntityIdSchema.safeParse(contractRef).success;
    const network = api.network.getCurrentNetwork();
    let stateKey: string;

    if (isEntityId) {
      stateKey = composeKey(network, contractRef);
    } else {
      const aliasRecord = api.alias.resolveOrThrow(
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
      stateKey = composeKey(network, aliasRecord.entityId);
    }

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
    chainHasAdminKey: boolean;
  }> {
    const { api, logger } = args;
    const contractState = new ZustandContractStateHelper(api.state, logger);
    const validArgs = parsedInput ?? ContractDeleteInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const isEntityId = EntityIdSchema.safeParse(contractRef).success;
    const network = api.network.getCurrentNetwork();
    let stateKey: string;
    let resolvedEntityId: string;

    if (isEntityId) {
      resolvedEntityId = contractRef;
      stateKey = composeKey(network, contractRef);
    } else {
      const aliasRecord = api.alias.resolveOrThrow(
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
      resolvedEntityId = aliasRecord.entityId;
      stateKey = composeKey(network, resolvedEntityId);
    }

    const fromState = contractState.getContract(stateKey);
    if (fromState) {
      return {
        contractToDelete: fromState,
        network,
        stateKey,
        contractRef,
        chainHasAdminKey: Boolean(
          fromState.adminPublicKey || fromState.adminKeyRefId,
        ),
      };
    }

    const contractInfo = await api.mirror.getContractInfo(resolvedEntityId);

    if (!contractInfo) {
      throw new NotFoundError(
        `Could not load contract '${contractRef}' from mirror`,
      );
    }

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
        `Could not resolve EVM address for contract '${contractRef}' from mirror`,
      );
    }

    const contractToDelete: ContractData = {
      contractId: contractInfo.contract_id,
      contractEvmAddress,
      contractName: undefined,
      network,
      adminPublicKey: contractInfo.admin_key?.key,
      adminKeyRefId: undefined,
    };

    logger.info(
      `Contract not in local state; using mirror info for ${contractToDelete.contractId}`,
    );

    return {
      contractToDelete,
      network,
      stateKey,
      contractRef,
      chainHasAdminKey: contractInfo.admin_key != null,
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
      api.config.getOption<KeyManager>('default_key_manager');

    let adminSignerKeyRefId: string | undefined =
      resolved.contractToDelete.adminKeyRefId;

    if (validArgs.adminKey !== undefined) {
      const signing = await api.keyResolver.resolveSigningKey(
        validArgs.adminKey,
        keyManager,
        false,
        ['contract:admin'],
      );
      adminSignerKeyRefId = signing.keyRefId;
    }

    if (!adminSignerKeyRefId) {
      if (!resolved.chainHasAdminKey) {
        throw new ValidationError(
          'This contract has no admin key on Hedera. On-network deletion is not possible. You can remove it from local CLI state only using --state-only flag.',
        );
      }
      throw new ValidationError(
        'Pass --admin-key (-a) with the contract admin credentials so the delete can be signed on Hedera.',
      );
    }

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

    if (transferAccountId === resolved.contractToDelete.contractId) {
      throw new ValidationError(
        'Transfer account must be different from the contract being deleted',
      );
    }
    if (transferContractId === resolved.contractToDelete.contractId) {
      throw new ValidationError(
        'Transfer target contract must be different from the contract being deleted',
      );
    }

    return {
      network: resolved.network,
      stateKey: resolved.stateKey,
      contractRef: resolved.contractRef,
      contractToDelete: resolved.contractToDelete,
      transferAccountId,
      transferContractId,
      adminSignerKeyRefId,
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
      [normalisedParams.adminSignerKeyRefId],
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
        contractName: normalisedParams.contractToDelete.contractName,
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
