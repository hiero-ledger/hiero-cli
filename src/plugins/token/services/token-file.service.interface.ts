import type {
  FungibleTokenFileDefinition,
  NonFungibleTokenFileDefinition,
} from '@/plugins/token/schema';

export interface TokenFileService {
  readAndValidateTokenFile(
    filename: string,
  ): Promise<FungibleTokenFileDefinition>;
  readAndValidateNftTokenFile(
    filename: string,
  ): Promise<NonFungibleTokenFileDefinition>;
}
