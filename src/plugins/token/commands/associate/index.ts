/**
 * Associate Token Command Exports
 * For use by tests and external consumers
 */
export {
  TOKEN_ASSOCIATE_COMMAND_NAME,
  tokenAssociate,
  TokenAssociateCommand,
} from './handler';
export type { TokenAssociateOutput } from './output';
export { TOKEN_ASSOCIATE_TEMPLATE, TokenAssociateOutputSchema } from './output';
