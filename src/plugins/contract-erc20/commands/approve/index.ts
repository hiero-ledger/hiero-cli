/**
 * Contract function approve Command Exports
 * For use by tests and external consumers
 */
export { approve, ContractErc20ApproveCommand } from './handler';
export type { ContractErc20CallApproveOutput } from './output';
export {
  CONTRACT_ERC20_CALL_APPROVE_TEMPLATE,
  ContractErc20CallApproveOutputSchema,
} from './output';
