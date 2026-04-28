### ADR-013: Core TransferService and AllowanceService Architecture

- Status: Proposed
- Date: 2026-04-28
- Related: `src/core/services/hbar/`, `src/core/services/token/token-service.interface.ts`, `src/core/core-api/core-api.interface.ts`, `src/plugins/hbar/`, `src/plugins/token/commands/transfer-*`, `src/plugins/swap/`, `docs/adr/ADR-001-plugin-architecture.md`

## Context

The atomic swap plugin requires a single `TransferTransaction` containing HBAR, fungible token (FT), and NFT transfers submitted together as one network call. The Hedera SDK's `TransferTransaction` natively supports all three asset types on a single object; the constraint is in the CLI service layer.

Currently, transfer and allowance operations are scattered across two services:

**`HbarService`** (`CoreApi.hbar`) — 2 methods:

- `transferTinybar` → builds a `TransferTransaction` for HBAR
- `createHbarAllowanceTransaction` → builds an `AccountAllowanceApproveTransaction` for HBAR

**`TokenService`** (`CoreApi.token`) — 5 transfer/allowance methods alongside 19 token-lifecycle methods:

- `createTransferTransaction` → `TransferTransaction` for FT
- `createNftTransferTransaction` → `TransferTransaction` for NFT
- `createFungibleTokenAllowanceTransaction` → FT allowance
- `createNftAllowanceApproveTransaction` → NFT allowance approve
- `createNftAllowanceDeleteTransaction` → NFT allowance delete

Because each method creates an independent transaction, there is no service-layer path for the swap plugin to compose multiple asset types into one `TransferTransaction`.

Beyond the swap use case, allowances and transfers are distinct concerns. An allowance does not move value — it grants a third party (another account or a smart contract) the right to move value on the owner's behalf at a later point. A smart contract can consume an approved allowance entirely independently of any `TransferTransaction` built by the CLI. Treating allowances as a sub-concern of transfer conflates two operations that have different consumers and different lifecycles.

`HbarService` has no reason to exist as a standalone service: its two methods belong to the transfer and allowance domains respectively.

This ADR introduces two new focused services — `TransferService` and `AllowanceService` — and removes `HbarService`.

## Decision

### Part 1: Service Boundaries After Migration

**`TransferService`** (`CoreApi.transfer`) — owns all operations that move value between accounts:

| Method                    | Source                                      | Description                                                                      |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `buildHbarTransfer`       | `HbarService.transferTinybar`               | Single HBAR transfer                                                             |
| `buildFtTransfer`         | `TokenService.createTransferTransaction`    | Single FT transfer                                                               |
| `buildNftTransfer`        | `TokenService.createNftTransferTransaction` | Single NFT transfer                                                              |
| `buildMultiAssetTransfer` | _(new)_                                     | Multi-asset transfer combining HBAR, FT, and/or NFT in one `TransferTransaction` |

**`AllowanceService`** (`CoreApi.allowance`) — owns all operations that authorise a third party to move value:

| Method                     | Source                                                 | Description              |
| -------------------------- | ------------------------------------------------------ | ------------------------ |
| `buildHbarAllowance`       | `HbarService.createHbarAllowanceTransaction`           | HBAR spending allowance  |
| `buildFtAllowance`         | `TokenService.createFungibleTokenAllowanceTransaction` | FT spending allowance    |
| `buildNftAllowanceApprove` | `TokenService.createNftAllowanceApproveTransaction`    | NFT transfer allowance   |
| `buildNftAllowanceDelete`  | `TokenService.createNftAllowanceDeleteTransaction`     | NFT allowance revocation |

**`TokenService`** (`CoreApi.token`) — retains token lifecycle only:

`createTokenTransaction`, `createTokenAssociationTransaction`, `createTokenDissociationTransaction`, `createMintTransaction`, `createDeleteTransaction`, `createFreezeTransaction`, `createUnfreezeTransaction`, `createGrantKycTransaction`, `createRevokeKycTransaction`, `createPauseTransaction`, `createUnpauseTransaction`, `createAirdropFtTransaction`, `createAirdropNftTransaction`, `createClaimAirdropTransaction`, `createCancelAirdropTransaction`, `createBurnFtTransaction`, `createBurnNftTransaction`, `createUpdateNftMetadataTransaction`, `createRejectAirdropTransaction`.

**`HbarService`** — removed. `CoreApi.hbar` is deleted; callers migrate to `CoreApi.transfer` or `CoreApi.allowance` as appropriate.

### Part 2: Token Association Stays in TokenService

`createTokenAssociationTransaction` and `createTokenDissociationTransaction` remain in `TokenService`.

Association configures which tokens an account can hold — it does not move value and it does not authorise future movement of value. It is an account-token relationship setup operation and belongs with other token-lifecycle methods.

### Part 3: TransferService Interface

```ts
// src/core/services/transfer/transfer-service.interface.ts
import type { TransferTransaction } from '@hashgraph/sdk';
import type {
  FtTransferParams,
  HbarTransferParams,
  MultiAssetTransferEntry,
  NftTransferParams,
} from './types';

export interface TransferService {
  buildHbarTransfer(params: HbarTransferParams): TransferTransaction;
  buildFtTransfer(params: FtTransferParams): TransferTransaction;
  buildNftTransfer(params: NftTransferParams): TransferTransaction;
  buildMultiAssetTransfer(
    entries: MultiAssetTransferEntry[],
    memo?: string,
  ): TransferTransaction;
}
```

### Part 4: AllowanceService Interface

```ts
// src/core/services/allowance/allowance-service.interface.ts
import type {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
} from '@hashgraph/sdk';
import type {
  FtAllowanceParams,
  HbarAllowanceParams,
  NftAllowanceApproveParams,
  NftAllowanceDeleteParams,
} from './types';

export interface AllowanceService {
  buildHbarAllowance(
    params: HbarAllowanceParams,
  ): AccountAllowanceApproveTransaction;
  buildFtAllowance(
    params: FtAllowanceParams,
  ): AccountAllowanceApproveTransaction;
  buildNftAllowanceApprove(
    params: NftAllowanceApproveParams,
  ): AccountAllowanceApproveTransaction;
  buildNftAllowanceDelete(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction;
}
```

### Part 5: Transfer and Allowance Types

```ts
// src/core/services/transfer/types.ts

export interface HbarTransferParams {
  from: string;
  to: string;
  amountTinybar: bigint;
  memo?: string;
}

export interface FtTransferParams {
  from: string;
  to: string;
  tokenId: string;
  amount: bigint;
}

export interface NftTransferParams {
  from: string;
  to: string;
  tokenId: string;
  serialNumber: bigint;
}

export type HbarTransferEntry = { type: 'hbar' } & Omit<
  HbarTransferParams,
  'memo'
>;
export type FtTransferEntry = { type: 'ft' } & FtTransferParams;
export type NftTransferEntry = { type: 'nft' } & NftTransferParams;

export type MultiAssetTransferEntry =
  | HbarTransferEntry
  | FtTransferEntry
  | NftTransferEntry;
```

```ts
// src/core/services/allowance/types.ts

export interface HbarAllowanceParams {
  ownerAccountId: string;
  spenderAccountId: string;
  amountTinybar: bigint;
}

export interface FtAllowanceParams {
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  amount: bigint;
}

export interface NftAllowanceApproveParams {
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  serialNumbers?: bigint[];
  approveForAll?: boolean;
}

export interface NftAllowanceDeleteParams {
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  serialNumbers?: bigint[];
}
```

`buildMultiAssetTransfer` iterates over the entries and applies `addHbarTransfer`, `addTokenTransfer`, or `addNftTransfer` to a single `TransferTransaction` instance. The three single-asset convenience methods (`buildHbarTransfer`, `buildFtTransfer`, `buildNftTransfer`) delegate to `buildMultiAssetTransfer` with a single-element array. The `memo` field from `HbarTransferParams` is passed as the second argument of `buildMultiAssetTransfer`; for `buildFtTransfer` and `buildNftTransfer`, which have no memo, `undefined` is passed. This means all transfer construction shares one code path and memo handling is consistent.

### Part 6: CoreApi Changes

```ts
// src/core/core-api/core-api.interface.ts — diff
- import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
+ import type { AllowanceService } from '@/core/services/allowance/allowance-service.interface';
+ import type { TransferService } from '@/core/services/transfer/transfer-service.interface';

  export interface CoreApi {
    ...
-   hbar: HbarService;
+   transfer: TransferService;
+   allowance: AllowanceService;
    ...
  }
```

`CoreApi.token` is unchanged at the interface level; only its declaration loses the 5 migrated methods.

### Part 7: Callers to Migrate

The following handlers are the only callers of the methods being moved. Updates are mechanical renames with no business logic changes:

| Handler                                                  | Old call                                                              | New call                                                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/hbar/commands/transfer/handler.ts`              | `api.hbar.transferTinybar(...)`                                       | `api.transfer.buildHbarTransfer(...)`                                                                                                                      |
| `plugins/hbar/commands/allowance/handler.ts`             | `api.hbar.createHbarAllowanceTransaction(...)`                        | `api.allowance.buildHbarAllowance(...)`                                                                                                                    |
| `plugins/hbar/commands/allowance-revoke/handler.ts`      | `api.hbar.createHbarAllowanceTransaction({ ..., amountTinybar: 0n })` | `api.allowance.buildHbarAllowance({ ..., amountTinybar: 0n })` — revoke reuses the same method with a zero amount; no separate revoke method is introduced |
| `plugins/token/commands/transfer-ft/handler.ts`          | `api.token.createTransferTransaction(...)`                            | `api.transfer.buildFtTransfer(...)`                                                                                                                        |
| `plugins/token/commands/transfer-nft/handler.ts`         | `api.token.createNftTransferTransaction(...)`                         | `api.transfer.buildNftTransfer(...)`                                                                                                                       |
| `plugins/token/commands/allowance-ft/handler.ts`         | `api.token.createFungibleTokenAllowanceTransaction(...)`              | `api.allowance.buildFtAllowance(...)`                                                                                                                      |
| `plugins/token/commands/allowance-nft/handler.ts`        | `api.token.createNftAllowanceApproveTransaction(...)`                 | `api.allowance.buildNftAllowanceApprove(...)`                                                                                                              |
| `plugins/token/commands/delete-allowance-nft/handler.ts` | `api.token.createNftAllowanceDeleteTransaction(...)`                  | `api.allowance.buildNftAllowanceDelete(...)`                                                                                                               |
| `plugins/swap/commands/*/handler.ts`                     | _(new)_                                                               | `api.transfer.buildMultiAssetTransfer(...)`                                                                                                                |

The following mock files must be updated as part of this migration:

| Mock file                                                 | Change required                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plugins/hbar/__tests__/unit/helpers/mocks.ts`            | Replace `transferTinybar` / `createHbarAllowanceTransaction` with mocks for `TransferService` and `AllowanceService` |
| `src/__tests__/mocks/mocks.ts`                            | Remove `hbar: makeHbarMock()` from the CoreApi mock; add `transfer` and `allowance` mock entries                     |
| `plugins/token/__tests__/unit/helpers/mocks.ts`           | Remove the 5 migrated methods from the `TokenService` mock                                                           |
| `plugins/contract-erc20/__tests__/unit/helpers/mocks.ts`  | Remove the 5 migrated methods from the `TokenService` mock                                                           |
| `plugins/contract-erc721/__tests__/unit/helpers/mocks.ts` | Remove the 5 migrated methods from the `TokenService` mock                                                           |

## Migration Strategy

### Phase 1: Add TransferService and AllowanceService

1. Create `src/core/services/transfer/types.ts`
2. Create `src/core/services/transfer/transfer-service.interface.ts`
3. Create `src/core/services/transfer/transfer-service.ts` (`TransferServiceImpl`)
4. Create `src/core/services/transfer/index.ts`
5. Create `src/core/services/allowance/types.ts`
6. Create `src/core/services/allowance/allowance-service.interface.ts`
7. Create `src/core/services/allowance/allowance-service.ts` (`AllowanceServiceImpl`)
8. Create `src/core/services/allowance/index.ts`
9. Add `transfer: TransferService` and `allowance: AllowanceService` to `CoreApi` and instantiate both in `CoreAPI`
10. Add both services to `src/core/index.ts` exports

### Phase 2: Migrate callers

1. Update the 8 existing plugin handlers listed above (all rows except the swap row, which is new code) to call `api.transfer.*` or `api.allowance.*`
2. Remove the 5 methods from `TokenService` interface and `TokenServiceImpl`
3. Update all 5 mock files listed in Part 7

### Phase 3: Remove HbarService

1. Remove `hbar: HbarService` from `CoreApi` interface
2. Remove `HbarService` import and instantiation from `CoreAPI`
3. Delete `src/core/services/hbar/`
4. Update `src/core/index.ts` — remove `HbarService` exports

## Pros and Cons

### Pros

- **Atomic swap unblocked.** The swap plugin has a single entry point (`api.transfer.buildMultiAssetTransfer`) to build a `TransferTransaction` with any combination of HBAR, FT, and NFT entries.
- **Allowances are independent from transfers.** An allowance granted for a smart contract has nothing to do with any `TransferTransaction` the CLI builds. The split reflects this.
- **HbarService eliminated.** A 2-method wrapper with no independent reason to exist is removed.
- **TokenService becomes coherent.** After migration every method on `TokenService` is a token-lifecycle operation.
- **Consistent naming.** All methods in both new services follow the `build*` convention used elsewhere in the service layer.
- **Single code path for transfer construction.** The single-asset methods delegate to `buildMultiAssetTransfer`; no duplicated `TransferTransaction`-construction logic.
- **Return types are predictable per service.** `TransferService` always returns `TransferTransaction`. `AllowanceService` returns `AccountAllowanceApproveTransaction` for most methods; `buildNftAllowanceDelete` is the exception (see Cons). Mocking is straightforward in both cases.

### Cons

- **Two new services instead of one.** `CoreApi` gains two properties (`transfer`, `allowance`) rather than one. This is a minor cost given the improved clarity.
- **`buildNftAllowanceDelete` returns a union type.** The method returns either `AccountAllowanceApproveTransaction` or `AccountAllowanceDeleteTransaction` depending on whether serial numbers are specified. This is an SDK constraint inherited from `TokenService`, not a new problem, but it means `AllowanceService` return types are not fully uniform.
- **Migration touches 8 existing plugin handlers and 5 mock files.** The changes are mechanical but broad. Risk is low given that business logic is unchanged.

## Consequences

- `CoreApi.hbar` is removed. References to it cause a compile error after Phase 3.
- `CoreApi.transfer` is the single entry point for all value-movement operations.
- `CoreApi.allowance` is the single entry point for all spending-authorisation operations.
- `TokenService` is scoped to token lifecycle only: creation, deletion, minting, burning, freezing, KYC, pausing, airdrops, association, dissociation.
- New transfer-type commands (e.g. a scheduled HBAR transfer) add methods to `TransferService`.
- New allowance-type commands (e.g. a bulk approve for a smart contract integration) add methods to `AllowanceService`.

## Testing Strategy

- **Unit: `TransferServiceImpl`** — test each method in isolation. For `buildMultiAssetTransfer`, test all asset-type combinations (HBAR+FT, HBAR+NFT, FT+NFT, all three) and verify the returned transaction contains the expected transfer entries.
- **Unit: `AllowanceServiceImpl`** — test each allowance builder with valid params; verify the correct `AccountAllowanceApproveTransaction` / `AccountAllowanceDeleteTransaction` is constructed.
- **Unit: migrated plugin handlers** — update existing tests to point mocks at `api.transfer` or `api.allowance` instead of `api.hbar` / `api.token`. Business logic assertions remain unchanged.
- **Integration** — existing HBAR and token transfer/allowance integration tests pass after migration with only the mock/service path updated.
