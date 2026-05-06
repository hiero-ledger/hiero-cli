export {
  CONTRACT_UPDATE_COMMAND_NAME,
  contractUpdate,
  UpdateContractCommand,
} from './handler';
export type { ContractUpdateOutput } from './output';
export { CONTRACT_UPDATE_TEMPLATE, ContractUpdateOutputSchema } from './output';
export type {
  ContractUpdateBuildTransactionResult,
  ContractUpdateExecuteTransactionResult,
  ContractUpdateNormalisedParams,
  ContractUpdateSignTransactionResult,
} from './types';
