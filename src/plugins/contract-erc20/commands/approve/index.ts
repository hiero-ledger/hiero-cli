/**
 * Contract balanceOf Command Exports
 * For use by tests and external consumers
 */
export { contractErc20Approve, ContractErc20ApproveCommand } from './handler';
export type { ContractErc20CallApproveOutput } from './output';
export {
  CONTRACT_ERC20_CALL_APPROVE_TEMPLATE,
  ContractErc20CallApproveOutputSchema,
} from './output';
