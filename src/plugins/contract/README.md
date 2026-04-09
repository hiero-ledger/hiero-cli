# Contract Plugin

Smart contract management plugin for the Hiero CLI. Handles compilation, deployment, and verification of Solidity smart contracts on the Hedera network.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **Namespace Isolation**: Own state namespace (`contract-contracts`)
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/contract/
├── manifest.ts
├── schema.ts
├── contract-helper.ts       # Local state cleanup after delete
├── commands/
│   ├── create/
│   ├── import/
│   ├── list/
│   └── delete/
├── utils/
│   └── contract-file-helpers.ts
├── zustand-state-helper.ts
├── __tests__/unit/
└── index.ts
```

## 🚀 Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

### Contract Create

Compiles a Solidity file, deploys the contract to Hedera, and verifies it on HashScan (skipped for localnet).

Either `--file` or `--default` must be provided (mutually exclusive).

**Required options:**

| Option    | Short | Description                                                                       |
| --------- | ----- | --------------------------------------------------------------------------------- |
| `name`    | `n`   | Smart contract name/alias in the state                                            |
| `file`    | `f`   | Path to Solidity file (absolute or relative). Required when not using `--default` |
| `default` | `d`   | Use built-in template: `erc20` or `erc721`. Required when not using `--file`      |

**Optional options:**

| Option                  | Short | Description                                                                                                                                         | Default                                                            |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `base-path`             | `b`   | Base path for contract imports                                                                                                                      | Current directory (with `--file`), package root (with `--default`) |
| `gas`                   | `g`   | Gas for contract creation                                                                                                                           | 2000000                                                            |
| `admin-key`             | `a`   | Repeatable. Admin key credential(s) for the new contract (formats: alias, key ref, `ed25519`/`ecdsa` public/private strings, etc.—see CLI help).    | -                                                                  |
| `admin-key-threshold`   | `A`   | M-of-N: how many of the provided `--admin-key` values must sign the contract create flow. Only valid when multiple `--admin-key` entries are given. | -                                                                  |
| `memo`                  | `m`   | Contract memo (max 100 chars)                                                                                                                       | -                                                                  |
| `solidity-version`      | `v`   | Solidity compiler version                                                                                                                           | -                                                                  |
| `constructor-parameter` | `c`   | Repeatable constructor arguments. With `--default`, optional (defaults apply)                                                                       | -                                                                  |
| `key-manager`           | `k`   | Key manager: local or local_encrypted                                                                                                               | Config setting                                                     |

On Hedera, the contract admin key can be modeled as a **KeyList** or **ThresholdKey**. Pass **`--admin-key`** multiple times for multiple admin identities, and **`--admin-key-threshold`** when you need an **M-of-N** signing policy on the contract create flow.

**Example with custom file:**

```bash
hcli contract create \
  --name token-contract \
  --file ./Token.sol \
  --base-path ./contracts \
  --constructor-parameter "MyToken" \
  --constructor-parameter "MTK" \
  --admin-key operator-name
```

**Example with built-in ERC20 template (default constructor params: FungibleToken, FTK, 1000000):**

```bash
hcli contract create --name my-token --default erc20
```

**Example with built-in ERC721 template (default constructor params: NonFungibleToken, NFTK):**

```bash
hcli contract create --name my-nft --default erc721
```

**Example with built-in template and custom constructor params:**

```bash
hcli contract create --name my-token --default erc20 -c "CustomToken" -c "CTK" -c "500000"
```

**Multiple admin keys with threshold (e.g. 2-of-3):**

```bash
hcli contract create \
  --name multi-admin \
  --file ./MyContract.sol \
  --admin-key alice --admin-key bob --admin-key carol \
  --admin-key-threshold 2
```

### Contract Import

Imports an existing contract from Hedera (by contract ID or EVM address) into local state. Fetches contract info from the mirror node, reads the on-chain **admin key** (including **KeyList** and **ThresholdKey**), derives the set of admin public keys and the effective **M-of-N** threshold, matches public keys to local KMS entries where possible, and stores `adminKeyRefIds` and `adminKeyThreshold` in CLI state for later commands (e.g. network delete).

**Main options:** `--contract` (`-c`, required), optional `--name`, `--verified`.

| Option     | Short | Description                                                                   |
| ---------- | ----- | ----------------------------------------------------------------------------- |
| `contract` | `c`   | Contract ID or EVM address (required)                                         |
| `name`     | `n`   | Optional local name (stored in state and registered for `--contract` lookups) |
| `verified` | `v`   | Whether the contract is verified on Hashscan (default: false)                 |

```bash
hcli contract import --contract 0.0.123456 --name myContract
```

### Contract List

Lists all deployed contracts stored in the state across all networks.

```bash
hcli contract list
```

### Contract Delete

**Default:** submits `ContractDeleteTransaction` on Hedera, then removes the contract from local CLI state. **With `--state-only`:** only removes from local CLI state (no network transaction).

When deleting on Hedera (default), pass **`--transfer-id` (`-t`)** or **`--transfer-contract-id` (`-r`)** so remaining HBAR has a destination.

**Admin signing:** The CLI compares your credentials to the contract’s admin key from the mirror (**including KeyList / ThresholdKey**). If the contract is in local state with `adminKeyRefIds` and the same keys exist in KMS, you can delete on the network **without** `--admin-key`. Otherwise pass **`--admin-key`** one or more times (same credential formats as create) so the delete can be signed—including for **M-of-N** admin policies, where you must supply enough distinct credentials to satisfy the threshold. If local state or KMS does not have the needed material, use `--admin-key` explicitly.

If the contract is **not** in local state, the CLI loads contract info from the mirror node. Contracts **without** a deletable admin key configuration on Hedera may only be removed from local state with **`--state-only`**.

```bash
hcli contract delete --contract myAlias --transfer-id 0.0.5678
hcli contract delete --contract 0.0.123456 --state-only
```

**Threshold admin (e.g. 2-of-3):** pass multiple `--admin-key` values corresponding to distinct keys that meet the on-chain requirement, for example:

```bash
hcli contract delete --contract 0.0.123456 --transfer-id 0.0.5678 \
  --admin-key alice --admin-key bob
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.contract` - Contract deployment and `ContractDeleteTransaction` construction
- `api.contractCompiler` - Solidity compilation
- `api.contractVerifier` - HashScan verification
- `api.txSign` / `api.txExecute` - Signing and execution (including contract create flow)
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.alias` - Name registration and resolution
- `api.mirror` - Contract info when deleting on network without a local state entry
- `api.config` - Configuration (key manager default)
- `api.keyResolver` - Resolving admin credentials for create/delete (including mapping stored `adminKeyRefIds` from state to public keys for mirror checks)
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandResult` interface:

```typescript
interface CommandResult {
  result: object;
}
```

**Output schemas:**

- **Create**: `contractId`, `contractName`, `contractEvmAddress`, `name`, `network`, `transactionId`, `adminKeyPresent`, `adminKeyThreshold`, `adminKeyCount`, `verified`
- **Import**: `contractId`, `contractEvmAddress`, `name`, `network`, `memo`, `verified`
- **List**: `contracts` (array with `contractId`, `name`, `contractEvmAddress`, `adminKeyPresent`, `network`, `verified`), `totalCount`
- **Delete**: `deletedContract`, `network`, optional `removedAliases`, `transactionId`, `stateOnly`

Human-readable output uses Handlebars templates with HashScan links for contract and transaction IDs.

## 📊 State Management

Contract data is stored in the `contract-contracts` namespace with the following structure:

```typescript
interface ContractData {
  contractId: string; // Hedera contract ID (0.0.xxxxx)
  name?: string; // Optional local name for `--contract` lookups (same idea as account `name`)
  contractEvmAddress: string; // Deployed contract EVM address
  adminKeyRefIds: string[]; // KMS key refs for contract admin key material (from create/import; used for network delete)
  adminKeyThreshold: number; // M-of-N when admin key is a KeyList/ThresholdKey on Hedera (0 if not applicable)
  network: SupportedNetwork; // Network
  memo?: string; // Optional memo (max 100 chars)
  verified?: boolean; // Contract verification status (e.g. HashScan)
}
```

Aliases are registered in the alias service with type `contract` for name resolution.

## ✅ Contract Verification

- **mainnet, testnet, previewnet**: Contracts are automatically verified on HashScan after deployment
- **localnet**: Verification is skipped (not supported)

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm run test:unit -- src/plugins/contract/__tests__/unit
```
