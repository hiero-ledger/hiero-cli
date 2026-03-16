/**
 * Contract ownerOf Command Exports
 * For use by tests and external consumers
 */
export { contractErc721OwnerOf, ContractErc721OwnerOfCommand } from './handler';
export type { ContractErc721CallOwnerOfOutput } from './output';
export {
  CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE,
  ContractErc721CallOwnerOfOutputSchema,
} from './output';
