import type {
  FungibleTokenFileDefinition,
  NonFungibleTokenFileDefinition,
} from '@/plugins/token/schema';

export interface TokenFileService {
  readAndValidateFtTokenFile(
    filename: string,
  ): Promise<FungibleTokenFileDefinition>;
  readAndValidateNftTokenFile(
    filename: string,
  ): Promise<NonFungibleTokenFileDefinition>;
}
