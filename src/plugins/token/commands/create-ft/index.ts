/**
 * Create Token Command Exports
 * For use by tests and external consumers
 */
export {
  createFt,
  CreateFtCommand,
  TOKEN_CREATE_FT_COMMAND_NAME,
} from './handler';
export type { CreateFungibleTokenOutput } from './output';
export {
  CREATE_FUNGIBLE_TOKEN_TEMPLATE,
  CreateFungibleTokenOutputSchema,
} from './output';
