### ADR-014: Core TransferService and AllowanceService Architecture

- Status: Proposed
- Date: 2026-04-28
- Related: `src/core/services/hbar/`, `src/core/services/token/token-service.interface.ts`, `src/core/core-api/core-api.interface.ts`, `src/plugins/hbar/`, `src/plugins/token/commands/transfer-*`, `docs/adr/ADR-001-plugin-architecture.md`

## Context

The CLI currently splits operations of the same SDK transaction type across multiple services. `TransferTransaction` — the Hedera SDK type that moves HBAR, fungible tokens, and NFTs — is constructed in two separate places: `HbarService.transferTinybar` for HBAR and `TokenService.createTransferTransaction` / `createNftTransferTransaction` for tokens. Because each method creates its own independent transaction instance, there is no service-layer path to compose multiple asset types into a single `TransferTransaction`, which is what the Hedera SDK requires for multi-asset operations such as atomic swaps.

The same fragmentation applies to allowances: `HbarService.createHbarAllowanceTransaction` and three methods on `TokenService` all build `AccountAllowanceApproveTransaction` / `AccountAllowanceDeleteTransaction`, but live in different services with no unifying boundary.

`HbarService` (`CoreApi.hbar`) currently holds 2 methods:

- `transferTinybar` → builds a `TransferTransaction` for HBAR
- `createHbarAllowanceTransaction` → builds an `AccountAllowanceApproveTransaction` for HBAR

`TokenService` (`CoreApi.token`) holds 5 transfer/allowance methods alongside its token-lifecycle responsibilities:

- `createTransferTransaction` → `TransferTransaction` for FT
- `createNftTransferTransaction` → `TransferTransaction` for NFT
- `createFungibleTokenAllowanceTransaction` → FT allowance
- `createNftAllowanceApproveTransaction` → NFT allowance approve
- `createNftAllowanceDeleteTransaction` → NFT allowance delete

Beyond the structural problem, allowances and transfers are distinct concerns. An allowance does not move value — it grants a third party (another account or a smart contract) the right to move value on the owner's behalf at a later point. A smart contract can consume an approved allowance entirely independently of any `TransferTransaction` built by the CLI. Grouping allowances with transfers conflates two operations that have different consumers and different lifecycles.

`HbarService` has no reason to exist as a standalone service: its two methods belong to the transfer and allowance domains respectively.

This ADR introduces two new focused services — `TransferService` and `AllowanceService` — and removes `HbarService`.

## Decision

### Part 1: Service Boundaries After Migration

**`TransferService`** (`CoreApi.transfer`) — owns all operations that move value between accounts:

| Method                     | Source                                                                                                  | Returns               | Description                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildTransferTransaction` | `HbarService.transferTinybar`, `TokenService.createTransferTransaction`, `createNftTransferTransaction` | `TransferTransaction` | Transfer of one or more assets (HBAR, FT, NFT) in a single `TransferTransaction`; each entry is a class instance that carries its own SDK call; pass a single-element array for a simple transfer |

**`AllowanceService`** (`CoreApi.allowance`) — owns all operations that authorise a third party to move value:

| Method                    | Source                                                                                                                                       | Returns                                                                   | Description                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `buildAllowanceApprove`   | `HbarService.createHbarAllowanceTransaction`, `TokenService.createFungibleTokenAllowanceTransaction`, `createNftAllowanceApproveTransaction` | `AccountAllowanceApproveTransaction`                                      | Approve an allowance for any asset type (HBAR, FT, or NFT); each entry is a class instance that carries its own SDK call |
| `buildNftAllowanceDelete` | `TokenService.createNftAllowanceDeleteTransaction`                                                                                           | `AccountAllowanceApproveTransaction \| AccountAllowanceDeleteTransaction` | NFT allowance revocation                                                                                                 |

**`TokenService`** (`CoreApi.token`) — the following 5 methods are removed and migrated to the services above; all remaining token-lifecycle methods are unchanged:

- `createTransferTransaction` → moves to `TransferService`
- `createNftTransferTransaction` → moves to `TransferService`
- `createFungibleTokenAllowanceTransaction` → moves to `AllowanceService`
- `createNftAllowanceApproveTransaction` → moves to `AllowanceService`
- `createNftAllowanceDeleteTransaction` → moves to `AllowanceService`

`createTokenAssociationTransaction` and `createTokenDissociationTransaction` stay in `TokenService`: association configures which tokens an account can hold and does not move value, so it belongs with other token-lifecycle methods.

**`HbarService`** — removed. `CoreApi.hbar` is deleted; callers migrate to `CoreApi.transfer` or `CoreApi.allowance` as appropriate.

### Part 2: TransferService Interface

```ts
// src/core/services/transfer/transfer-service.interface.ts
import type { TransferTransaction } from '@hiero-ledger/sdk';
import type { TransferEntry } from './transfer-entries/transfer-entry.interface';

export interface TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction;
}
```

### Part 3: AllowanceService Interface

```ts
// src/core/services/allowance/allowance-service.interface.ts
import type {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
} from '@hiero-ledger/sdk';
import type { AllowanceEntry } from './allowance-entries/allowance-entry.interface';
import type { NftAllowanceDeleteParams } from './types';

export interface AllowanceService {
  buildAllowanceApprove(
    entries: AllowanceEntry[],
  ): AccountAllowanceApproveTransaction;
  buildNftAllowanceDelete(
    params: NftAllowanceDeleteParams,
  ): AccountAllowanceApproveTransaction | AccountAllowanceDeleteTransaction;
}
```

### Part 4: Transfer and Allowance Types

```ts
// src/core/services/transfer/transfer-entries/transfer-entry.interface.ts
import type { TransferTransaction } from '@hiero-ledger/sdk';

export interface TransferEntry {
  apply(tx: TransferTransaction): void;
}
```

```ts
// src/core/services/transfer/transfer-entries/hbar-transfer-entry.ts
export class HbarTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly amountTinybar: bigint,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addHbarTransfer(
      AccountId.fromString(this.from),
      new Hbar((-this.amountTinybar).toString(), HbarUnit.Tinybar),
    );
    tx.addHbarTransfer(
      AccountId.fromString(this.to),
      new Hbar(this.amountTinybar.toString(), HbarUnit.Tinybar),
    );
  }
}
```

```ts
// src/core/services/transfer/transfer-entries/ft-transfer-entry.ts
export class FtTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly tokenId: string,
    public readonly amount: bigint,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addTokenTransfer(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.from),
      -Long.fromString(this.amount.toString()),
    );
    tx.addTokenTransfer(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.to),
      Long.fromString(this.amount.toString()),
    );
  }
}
```

```ts
// src/core/services/transfer/transfer-entries/nft-transfer-entry.ts
export class NftTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly tokenId: string,
    public readonly serialNumber: bigint,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addNftTransfer(
      new NftId(
        TokenId.fromString(this.tokenId),
        Long.fromString(this.serialNumber.toString()),
      ),
      AccountId.fromString(this.from),
      AccountId.fromString(this.to),
    );
  }
}
```

```ts
// src/core/services/allowance/allowance-entries/allowance-entry.interface.ts
import type { AccountAllowanceApproveTransaction } from '@hiero-ledger/sdk';

export interface AllowanceEntry {
  apply(tx: AccountAllowanceApproveTransaction): void;
}
```

```ts
// src/core/services/allowance/allowance-entries/hbar-allowance-entry.ts
export class HbarAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly amountTinybar: bigint,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    tx.approveHbarAllowance(
      AccountId.fromString(this.ownerAccountId),
      AccountId.fromString(this.spenderAccountId),
      new Hbar(this.amountTinybar.toString(), HbarUnit.Tinybar),
    );
  }
}
```

```ts
// src/core/services/allowance/allowance-entries/ft-allowance-entry.ts
export class FtAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly tokenId: string,
    public readonly amount: bigint,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    tx.approveTokenAllowance(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.ownerAccountId),
      AccountId.fromString(this.spenderAccountId),
      Long.fromString(this.amount.toString()),
    );
  }
}
```

```ts
// src/core/services/allowance/allowance-entries/nft-allowance-entry.ts
export class NftAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly tokenId: string,
    public readonly serialNumbers?: bigint[],
    public readonly approveForAll?: boolean,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    const tokenId = TokenId.fromString(this.tokenId);
    const owner = AccountId.fromString(this.ownerAccountId);
    const spender = AccountId.fromString(this.spenderAccountId);
    if (this.approveForAll === true) {
      tx.approveTokenNftAllowanceAllSerials(tokenId, owner, spender);
    } else {
      for (const serial of this.serialNumbers!) {
        tx.approveTokenNftAllowance(
          new NftId(tokenId, Long.fromString(serial.toString())),
          owner,
          spender,
        );
      }
    }
  }
}
```

```ts
// src/core/services/allowance/types.ts
export interface NftAllowanceDeleteSpecificParams {
  tokenId: string;
  ownerAccountId: string;
  serialNumbers: bigint[];
  allSerials?: false;
}

export interface NftAllowanceDeleteAllSerialsParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  allSerials: true;
}

export type NftAllowanceDeleteParams =
  | NftAllowanceDeleteSpecificParams
  | NftAllowanceDeleteAllSerialsParams;
```

`buildTransferTransaction` iterates over the entries and calls `entry.apply(tx)` on a single shared `TransferTransaction` instance, then sets `memo` if provided. Each entry class (`HbarTransferEntry`, `FtTransferEntry`, `NftTransferEntry`) encapsulates the SDK call for its asset type; the service contains no switch or type dispatch. An empty `entries` array is a programmer error; the implementation must throw before constructing a transaction so that a vacuous `TransferTransaction` is never submitted to the network.

`buildAllowanceApprove` iterates over the entries and calls `entry.apply(tx)` on a single shared `AccountAllowanceApproveTransaction` instance. Each entry class (`HbarAllowanceEntry`, `FtAllowanceEntry`, `NftAllowanceEntry`) encapsulates the SDK call for its asset type; the service contains no switch or type dispatch.

### Part 5: CoreApi Changes

```ts
// src/core/core-api/core-api.interface.ts — diff
+ import type { AllowanceService } from '@/core/services/allowance/allowance-service.interface';
+ import type { TransferService } from '@/core/services/transfer/transfer-service.interface';

  export interface CoreApi {
    ...
+   transfer: TransferService;
+   allowance: AllowanceService;
    ...
  }
```

The removal of `hbar: HbarService` is covered by Phase 3. `CoreApi.token` is unchanged at the interface level; only its declaration loses the 5 migrated methods.

### Part 6: Callers to Migrate

The following handlers are the only callers of the methods being moved. Updates are mechanical renames with no business logic changes:

| Handler                                                  | Old call                                                              | New call                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/hbar/commands/transfer/handler.ts`              | `api.hbar.transferTinybar(...)`                                       | `api.transfer.buildTransferTransaction([new HbarTransferEntry(...)], memo)`                                                                                         |
| `plugins/hbar/commands/allowance/handler.ts`             | `api.hbar.createHbarAllowanceTransaction(...)`                        | `api.allowance.buildAllowanceApprove([new HbarAllowanceEntry(...)])`                                                                                                |
| `plugins/hbar/commands/allowance-revoke/handler.ts`      | `api.hbar.createHbarAllowanceTransaction({ ..., amountTinybar: 0n })` | `api.allowance.buildAllowanceApprove([new HbarAllowanceEntry(..., 0n)])` — revoke reuses the same class with a zero amount; no separate revoke method is introduced |
| `plugins/token/commands/transfer-ft/handler.ts`          | `api.token.createTransferTransaction(...)`                            | `api.transfer.buildTransferTransaction([new FtTransferEntry(...)])`                                                                                                 |
| `plugins/token/commands/transfer-nft/handler.ts`         | `api.token.createNftTransferTransaction(...)`                         | `api.transfer.buildTransferTransaction([new NftTransferEntry(...)])`                                                                                                |
| `plugins/token/commands/allowance-ft/handler.ts`         | `api.token.createFungibleTokenAllowanceTransaction(...)`              | `api.allowance.buildAllowanceApprove([new FtAllowanceEntry(...)])`                                                                                                  |
| `plugins/token/commands/allowance-nft/handler.ts`        | `api.token.createNftAllowanceApproveTransaction(...)`                 | `api.allowance.buildAllowanceApprove([new NftAllowanceEntry(...)])`                                                                                                 |
| `plugins/token/commands/delete-allowance-nft/handler.ts` | `api.token.createNftAllowanceDeleteTransaction(...)`                  | `api.allowance.buildNftAllowanceDelete(...)`                                                                                                                        |

The following mock and test files must be updated as part of this migration:

**Mock helpers (CoreApi / service mocks):**

| File                                                      | Change required                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plugins/hbar/__tests__/unit/helpers/mocks.ts`            | Replace `transferTinybar` / `createHbarAllowanceTransaction` with mocks for `TransferService` and `AllowanceService` |
| `src/__tests__/mocks/mocks.ts`                            | Remove `hbar: makeHbarMock()` from the CoreApi mock; add `transfer` and `allowance` mock entries                     |
| `plugins/token/__tests__/unit/helpers/mocks.ts`           | Remove the 5 migrated methods from the `TokenService` mock                                                           |
| `plugins/contract-erc20/__tests__/unit/helpers/mocks.ts`  | Remove the 5 migrated methods from the `TokenService` mock                                                           |
| `plugins/contract-erc721/__tests__/unit/helpers/mocks.ts` | Remove the 5 migrated methods from the `TokenService` mock                                                           |

**Service unit tests:**

| File                                                           | Change required                                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/core/services/token/__tests__/unit/token-service.test.ts` | Remove test cases for the 5 migrated methods; migrate them to `TransferServiceImpl` and `AllowanceServiceImpl` tests |

**Plugin handler unit tests:**

| File                                                        | Change required                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `plugins/hbar/__tests__/unit/transfer.test.ts`              | Update to use `api.transfer.buildTransferTransaction` instead of `api.hbar.transferTinybar`                        |
| `plugins/token/__tests__/unit/transfer.test.ts`             | Update to use `api.transfer.buildTransferTransaction` instead of `api.token.createTransferTransaction`             |
| `plugins/token/__tests__/unit/allowance-ft.test.ts`         | Update to use `api.allowance.buildAllowanceApprove` instead of `api.token.createFungibleTokenAllowanceTransaction` |
| `plugins/token/__tests__/unit/allowance-nft.test.ts`        | Update to use `api.allowance.buildAllowanceApprove` instead of `api.token.createNftAllowanceApproveTransaction`    |
| `plugins/token/__tests__/unit/delete-allowance-nft.test.ts` | Update to use `api.allowance.buildNftAllowanceDelete` instead of `api.token.createNftAllowanceDeleteTransaction`   |

## Migration Strategy

### Phase 1: Add TransferService and AllowanceService

1. Create `src/core/services/transfer/transfer-entries/transfer-entry.interface.ts`
2. Create `src/core/services/transfer/transfer-entries/hbar-transfer-entry.ts`
3. Create `src/core/services/transfer/transfer-entries/ft-transfer-entry.ts`
4. Create `src/core/services/transfer/transfer-entries/nft-transfer-entry.ts`
5. Create `src/core/services/transfer/transfer-entries/index.ts`
6. Create `src/core/services/transfer/transfer-service.interface.ts`
7. Create `src/core/services/transfer/transfer-service.ts` (`TransferServiceImpl`)
8. Create `src/core/services/transfer/index.ts`
9. Create `src/core/services/allowance/allowance-entries/allowance-entry.interface.ts`
10. Create `src/core/services/allowance/allowance-entries/hbar-allowance-entry.ts`
11. Create `src/core/services/allowance/allowance-entries/ft-allowance-entry.ts`
12. Create `src/core/services/allowance/allowance-entries/nft-allowance-entry.ts`
13. Create `src/core/services/allowance/allowance-entries/index.ts`
14. Create `src/core/services/allowance/types.ts`
15. Create `src/core/services/allowance/allowance-service.interface.ts`
16. Create `src/core/services/allowance/allowance-service.ts` (`AllowanceServiceImpl`)
17. Create `src/core/services/allowance/index.ts`
18. Add `transfer: TransferService` and `allowance: AllowanceService` to `CoreApi` and instantiate both in `CoreAPI`
19. Add both services to `src/core/index.ts` exports

### Phase 2: Migrate callers

1. Update the 8 existing plugin handlers listed above to call `api.transfer.*` or `api.allowance.*`
2. Remove the 5 methods from `TokenService` interface and `TokenServiceImpl`
3. Update all 5 mock files listed in Part 6

### Phase 3: Remove HbarService

1. Remove `hbar: HbarService` from `CoreApi` interface
2. Remove `HbarService` import and instantiation from `CoreAPI`
3. Delete `src/core/services/hbar/`
4. Update `src/core/index.ts` — remove `HbarService` exports

## Pros and Cons

### Pros

- **Atomic swap unblocked.** A future atomic swap plugin will have a single entry point (`api.transfer.buildTransferTransaction`) to build a `TransferTransaction` with any combination of HBAR, FT, and NFT entries.
- **Allowances are independent from transfers.** An allowance granted for a smart contract has nothing to do with any `TransferTransaction` the CLI builds. The split reflects this.
- **HbarService eliminated.** A 2-method wrapper with no independent reason to exist is removed.
- **TokenService becomes coherent.** After migration every method on `TokenService` is a token-lifecycle operation.
- **Consistent naming.** All methods in both new services follow the `build*` convention used elsewhere in the service layer.
- **Minimal interface surface.** `TransferService` exposes a single method (`buildTransferTransaction`) that accepts an array of entries; `AllowanceService` exposes two methods (`buildAllowanceApprove`, `buildNftAllowanceDelete`). Both services use polymorphism — each entry class carries its own SDK call — keeping both service bodies free of type dispatch.
- **Return types are predictable per service.** `TransferService` always returns `TransferTransaction`. `AllowanceService` returns `AccountAllowanceApproveTransaction` for most methods; `buildNftAllowanceDelete` is the exception (see Cons). Mocking is straightforward in both cases.

### Cons

- **Two new services instead of one.** `CoreApi` gains two properties (`transfer`, `allowance`) rather than one. This is a minor cost given the improved clarity.
- **`buildNftAllowanceDelete` returns a union type.** The method returns `AccountAllowanceApproveTransaction` when `allSerials: true` (SDK uses `deleteTokenNftAllowanceAllSerials` on an approve transaction) and `AccountAllowanceDeleteTransaction` for specific serials. This is an SDK constraint inherited from `TokenService`, not a new problem, but it means `AllowanceService` return types are not fully uniform.
- **Migration touches 8 existing plugin handlers, 5 mock files, and 6 test files.** The changes are mechanical but broad. Risk is low given that business logic is unchanged.

## Consequences

- `CoreApi.hbar` is removed. References to it cause a compile error after Phase 3.
- `CoreApi.transfer` is the single entry point for all value-movement operations.
- `CoreApi.allowance` is the single entry point for all spending-authorisation operations.
- `TokenService` is scoped to token lifecycle only: creation, deletion, minting, burning, freezing, KYC, pausing, airdrops, association, dissociation.
- New transfer-type commands (e.g. a scheduled HBAR transfer) add methods to `TransferService`.
- New allowance-type commands (e.g. a bulk approve for a smart contract integration) add methods to `AllowanceService`.

## Testing Strategy

- **Unit: `TransferServiceImpl`** — test `buildTransferTransaction` in isolation. Cover all asset-type combinations (HBAR only, FT only, NFT only, HBAR+FT, HBAR+NFT, FT+NFT, all three) and verify the returned transaction contains the expected transfer entries.
- **Unit: `AllowanceServiceImpl`** — test each allowance builder with valid params; verify the correct `AccountAllowanceApproveTransaction` / `AccountAllowanceDeleteTransaction` is constructed.
- **Unit: migrated plugin handlers** — update existing tests to point mocks at `api.transfer` or `api.allowance` instead of `api.hbar` / `api.token`. Business logic assertions remain unchanged.
- **Integration** — existing HBAR and token transfer/allowance integration tests pass after migration with only the mock/service path updated.
