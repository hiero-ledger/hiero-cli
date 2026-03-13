/**
 * Associate Token Command Exports
 * For use by tests and external consumers
 */
export {
  AssociateTokenCommand,
  TOKEN_ASSOCIATE_COMMAND_NAME,
  tokenAssociate,
} from './handler';
export type { AssociateTokenOutput } from './output';
export { ASSOCIATE_TOKEN_TEMPLATE, AssociateTokenOutputSchema } from './output';
