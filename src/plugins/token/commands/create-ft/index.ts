/**
 * Create Token Command Exports
 * For use by tests and external consumers
 */
export { createFt, CreateFtCommand, createToken } from './handler';
export type { CreateFungibleTokenOutput } from './output';
export {
  CREATE_FUNGIBLE_TOKEN_TEMPLATE,
  CreateFungibleTokenOutputSchema,
} from './output';
