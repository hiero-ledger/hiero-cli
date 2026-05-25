# Testing Guide

This document defines the rules and patterns for writing unit tests in hiero-cli. All new tests must follow these conventions. The rules below are authoritative and override any legacy pattern found in existing test files.

---

## 1. File structure

```
src/
  __tests__/
    mocks/
      fixtures.ts                    ← ALL shared constants (IDs, keys, addresses, tx IDs)
      mocks.ts                       ← ALL shared mock factories (makeArgs, makeLogger, makeNetworkMock, …)
      hedera-sdk-mocks.ts            ← Mock helpers that use real SDK types (createMockTransaction, …)
      hedera-sdk-contract-mock.ts    ← Factory for jest.mock('@hiero-ledger/sdk') in contract tests
    utils/
      assert-output.ts               ← assertOutput() helper
  plugins/<name>/
    __tests__/unit/
      helpers/
        fixtures.ts    ← Plugin-specific constants only (must not duplicate global values)
        mocks.ts       ← Plugin-specific service helpers only (no makeArgs, no makeLogger)
      <command>.test.ts
```

---

## 2. The one `makeArgs`

There is exactly **one `makeArgs`** in the entire codebase: the global one in `src/__tests__/mocks/mocks.ts`. No plugin may define its own `makeArgs` (or any `make*Args` wrapper around it).

`makeArgs` provides default mocks for **all** `CoreApi` services. Pass only the overrides needed by the specific test.

```typescript
import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';

const logger = makeLogger();
const args = makeArgs(
  {
    // override only what this test exercises
    contractQuery: {
      queryContractFunction: jest.fn().mockResolvedValue({ result: '0x1' }),
    },
  },
  logger,
  { contract: 'some-alias-or-id' },
);
```

When a plugin needs a preconfigured service mock used across several tests, extract it into a **named service-level helper** in `helpers/mocks.ts` and pass the result into `makeArgs`:

```typescript
// swap/helpers/mocks.ts
export const makeSwapTxExecuteMock = () =>
  makeTxExecuteMock({
    executeImpl: jest.fn().mockResolvedValue({
      success: true,
      transactionId: MOCK_TX_ID,
      receipt: { status: { status: 'SUCCESS' } },
    }),
  });

// swap/create.test.ts
const args = makeArgs({ txExecute: makeSwapTxExecuteMock() }, logger, { ... });
```

---

## 3. `makeLogger`

Always import from the global module. Never redefine it in a plugin.

```typescript
// Correct
import { makeLogger } from '@/__tests__/mocks/mocks';

// Wrong — do not define this in plugin helpers/mocks.ts
export const makeLogger = (): jest.Mocked<Logger> => ({ info: jest.fn(), ... });
```

Plugin `helpers/mocks.ts` files that need to re-export `makeLogger` for backwards compatibility may do so with a single re-export line:

```typescript
export { makeLogger } from '@/__tests__/mocks/mocks';
```

---

## 4. Mocking `@hiero-ledger/sdk`

Mock `@hiero-ledger/sdk` **only** when the handler (or a non-mocked dependency) directly instantiates or calls SDK classes. Currently this applies to `contract-erc20` and `contract-erc721` only. All other plugins (account, token, topic, etc.) work through service abstractions and do **not** need this mock.

**Never** use bare `jest.mock('@hiero-ledger/sdk')` without a factory — Jest's auto-mock replaces `TokenType` with `undefined`, which breaks `constants.ts` at import time.

### Pattern A — read-only contract commands

Handler does not import SDK directly. Use `makeHederaSdkContractMock` for consistency with write tests:

```typescript
import { makeHederaSdkContractMock } from '@/__tests__/mocks/hedera-sdk-contract-mock';

jest.mock('@hiero-ledger/sdk', () => makeHederaSdkContractMock());
```

### Pattern B — write contract commands

Handler instantiates `ContractFunctionParameters` directly and needs argument spies:

```typescript
const mockAddAddress = jest.fn();
const mockContractFunctionParameters = jest.fn().mockReturnValue({
  addAddress: mockAddAddress.mockReturnThis(),
  addUint256: jest.fn().mockReturnThis(),
});

jest.mock('@hiero-ledger/sdk', () => ({
  ContractFunctionParameters: mockContractFunctionParameters,
  ContractId: {
    fromString: jest.fn().mockReturnValue({ toEvmAddress: jest.fn() }),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
}));
```

Do **not** use `makeHederaSdkContractMock` for Pattern B — it does not include `ContractFunctionParameters`.

### Pattern C — tests that need real SDK behaviour

Use `jest.requireActual` to keep real SDK methods while selectively overriding others. Keep as-is; do not convert to Pattern A or B.

---

## 5. Fixtures: global vs plugin-specific

**Global** `src/__tests__/mocks/fixtures.ts` owns all shared constants: entity IDs, addresses, public/private keys, transaction IDs, key ref IDs.

**Plugin** `helpers/fixtures.ts` is only for:

- Plugin-domain objects (`mockBatchData`, `mockSwapWithHbar`, `validTokenFile`, …)
- Constants with meaning only in that plugin's context (`BATCH_NAME`, `SCHEDULE_COMPOSED_KEY`, …)

Before adding a constant to a plugin fixture file, check if it already exists in the global file. If the same value is needed in multiple plugins, add it to global and import from there.

Key global constants to know:

| Constant                   | Value                             |
| -------------------------- | --------------------------------- |
| `MOCK_OPERATOR_ACCOUNT_ID` | `'0.0.100000'`                    |
| `MOCK_CONTRACT_ID`         | `'0.0.1234'`                      |
| `MOCK_CONTRACT_ID_UNKNOWN` | `'0.0.9999'`                      |
| `MOCK_ACCOUNT_ID`          | `'0.0.5678'`                      |
| `MOCK_ACCOUNT_ID_ALT`      | `'0.0.5679'`                      |
| `MOCK_TOPIC_ID`            | `'0.0.7777'`                      |
| `MOCK_TX_ID`               | `'0.0.1234@1234567890.123456789'` |
| `ECDSA_HEX_PUBLIC_KEY`     | `'0230a1f4…'` (64-char hex)       |

---

## 6. Enums over string literals

Never use raw strings where a TypeScript enum exists. This applies to mock data, `makeArgs` arguments, and assertions.

| String literal            | Correct enum                  | Import from                               |
| ------------------------- | ----------------------------- | ----------------------------------------- |
| `'testnet'`               | `SupportedNetwork.TESTNET`    | `@/core/types/shared.types`               |
| `'mainnet'`               | `SupportedNetwork.MAINNET`    | `@/core/types/shared.types`               |
| `'previewnet'`            | `SupportedNetwork.PREVIEWNET` | `@/core/types/shared.types`               |
| `'localnet'`              | `SupportedNetwork.LOCALNET`   | `@/core/types/shared.types`               |
| `'account'`               | `AliasType.Account`           | `@/core/types/shared.types`               |
| `'token'`                 | `AliasType.Token`             | `@/core/types/shared.types`               |
| `'topic'`                 | `AliasType.Topic`             | `@/core/types/shared.types`               |
| `'contract'`              | `AliasType.Contract`          | `@/core/types/shared.types`               |
| `'ecdsa'` / `'ECDSA'`     | `KeyAlgorithm.ECDSA`          | `@/core/shared/constants`                 |
| `'ed25519'` / `'ED25519'` | `KeyAlgorithm.ED25519`        | `@/core/shared/constants`                 |
| `'local'` (key manager)   | `KeyManager.local`            | `@/core/services/kms/kms-types.interface` |

---

## 7. What plugin `helpers/mocks.ts` may and may not contain

**Allowed:**

- Service-level mock helpers specific to the plugin (`makeSwapTxExecuteMock`, `makeBatchStateHelperMock`, `makeAccountTransactionServiceMock`, …)
- Re-export of `makeLogger` from global (one line only)
- `makeApiMocks(config?)` — plugin-specific `CoreApi` mock assembly, accepted only when the plugin's default for a service genuinely differs from the global default (e.g. `contract-erc20` / `contract-erc721`)

**Not allowed:**

- Local `makeLogger` definition (must re-export global)
- Any function named `makeArgs` or `make*Args` that wraps the global `makeArgs`
- Re-implementation of global factories (`makeNetworkMock`, `makeTxSignMock`, `makeKmsMock`, …)
- Constants that duplicate values already in `src/__tests__/mocks/fixtures.ts`

---

## 8. No re-exports or alias assignments in fixture files

Never re-export a symbol from another module (`export { X } from '...'`) and never create an alias assignment (`export const A = B`) in `helpers/fixtures.ts` files. If a constant from global fixtures is needed, import it directly at the usage site.

---

## 9. No `require()` in tests

Always use ES module `import` statements. Never use `require()` or `jest.requireActual()` outside of `jest.mock()` factory functions. Do not disable ESLint rules with inline comments to work around this.
