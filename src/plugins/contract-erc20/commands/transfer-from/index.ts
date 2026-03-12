/**
 * Contract function transferFrom Command Exports
 * For use by tests and external consumers
 */
export { ContractErc20TransferFromCommand, transferFrom } from './handler';
export type { ContractErc20CallTransferFromOutput } from './output';
export {
  CONTRACT_ERC20_CALL_TRANSFER_FROM_TEMPLATE,
  ContractErc20CallTransferFromOutputSchema,
} from './output';
