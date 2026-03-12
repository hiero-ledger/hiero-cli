/**
 * Contract function approve Command Exports
 * For use by tests and external consumers
 */
export {
  approve,
  CONTRACT_ERC20_APPROVE_COMMAND_NAME,
  ContractErc20ApproveCommand,
} from './handler';
export type { ContractErc20CallApproveOutput } from './output';
export {
  CONTRACT_ERC20_CALL_APPROVE_TEMPLATE,
  ContractErc20CallApproveOutputSchema,
} from './output';
