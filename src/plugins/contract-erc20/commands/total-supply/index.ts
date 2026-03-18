/**
 * Contract totalSupply Command Exports
 * For use by tests and external consumers
 */
export {
  contractErc20TotalSupply,
  ContractErc20TotalSupplyCommand,
} from './handler';
export type { ContractErc20CallTotalSupplyOutput } from './output';
export {
  CONTRACT_ERC20_CALL_TOTAL_SUPPLY_CREATE_TEMPLATE,
  ContractErc20CallTotalSupplyOutputSchema,
} from './output';
