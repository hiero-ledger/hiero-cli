### ADR-006: NFT plugin implementation (proposal)

- Status: Proposed
- Date: 2025-12-17
- Related: `src/hedera-cli.ts`, `src/core/*`, `src/plugins/*`

## Context

The Hiero CLI requires implementation of NFT plugin that would perform basic handling of NFT token operation on Hedera. Operations that should be covered would NFT creation, minting, transfer. We also need to consider proper approach of metadata file upload to IPFS pinning service or S3 service.

Goals:

- We should implement basic NFT operations that will use Hashgraph SDK methods to perform operations
- New commands should cover basic non-fungible tokens: create, mint, transfer and associate
- NFT information will need to be stored in state manager

## Decision

- New commands for NFT operations will be added to the existing token plugin with proper naming with `nft` prefix
- Old commands for fungible commands will be added prefix `ft` that would mean token handles fungible operations
- Operations that can be handled same way for non-fungible as for fungible tokens should stay unchanged for example `token associate` command
- The same storage will be used to store non-fungible token operation, the data model will vary from the original fungible token data model
- We will not support passing multiple metadata into one transaction execution - user can only provide one metadata link that will be added to for example mint transaction in each call

## Implementation Strategy

1. `token` plugin - commands summary:

   - `token ft-create` - renamed `token create` command for better clarity and user experience
   - `token nft-create` - new command for NFT creation, should prepare valid call with `@hashgraph/sdk` to create new NFT token
   - `token ft-mint` - new command for minting fungible tokens
   - `token nft-mint` - new command for minting non-fungible tokens
   - `token ft-transfer` - renamed `token transfer` command for better clarity and user experience
   - `token nft-transfer` - new command for transferring NFT serial between accounts
   - `token associate` - implemented and will remain unchanged
   - `token list` - unchanged command that will retrieve all tokens information stored in our state
   - `token view` - unchanged command for retrieving token information from Hedera Mirror Node REST API
   - `token nft-view` - new command that retrieves specific token's information for non-fungible token with all serials present. Can filter out by specific serial number

2. Token storage data model

To the existing data model we will add the `tokenType` with value set to `FungibleToken` or `NonFungibleToken`.
If additional data would be required to store inside the token state we will add discriminators by this `tokenType` field so that we can map data model to domain layer

## Testing

1. Implementation of unit tests for new commands' handlers
2. Additional integration tests that will full creation, minting and transfer operations for the non-fungible tokens

## Consequences

**Positive:**

1. Consistency - as the `@hashgraph/sdk` uses same methods for handling fungible and non-fungible token operations we would also use same command for performing these operations.
   That will result in more consistent approach from the user's perspective.
2. Simplicity - as we are using expanding `token` plugin we will not introduce another namespace for NFT data only. We will be using same storage and expand the model with `tokenType`.
   If we had needed to expand the data model and change it for one of the tokens we would discriminate by the newly added `tokenType` field.
3. Separation of the methods for creation, mint and transfer of token by the type will result in far less complexity of the handlers' methods.

**Negative:**

1. Further extension of the token data model could lead to complex data types that will be stored in the same storage file.
