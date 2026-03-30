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

| Option                  | Short | Description                                                                   | Default                                                            |
| ----------------------- | ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `base-path`             | `b`   | Base path for contract imports                                                | Current directory (with `--file`), package root (with `--default`) |
| `gas`                   | `g`   | Gas for contract creation                                                     | 2000000                                                            |
| `admin-key`             | `a`   | Admin key for the contract                                                    | -                                                                  |
| `memo`                  | `m`   | Contract memo (max 100 chars)                                                 | -                                                                  |
| `solidity-version`      | `v`   | Solidity compiler version                                                     | -                                                                  |
| `constructor-parameter` | `c`   | Repeatable constructor arguments. With `--default`, optional (defaults apply) | -                                                                  |
| `key-manager`           | `k`   | Key manager: local or local_encrypted                                         | Config setting                                                     |

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

### Contract Import

Imports an existing contract from Hedera (by contract ID or EVM address) into local state.

**Main options:** `--contract` (`-c`, required), optional `--name`, `--alias`, `--verified`.

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

When deleting on Hedera (default), pass **`--transfer-id` (`-t`)** or **`--transfer-contract-id` (`-r`)** so remaining HBAR has a destination (avoids `OBTAINER_REQUIRED` from the network). Use `--admin-key` when signing material for the contract admin key is not already in state (same formats as create). Contracts **without** an admin key on Hedera cannot be deleted on the network—use `--state-only` to drop local CLI state only. If the contract is not in local state, the CLI loads contract info from the mirror node.

```bash
hcli contract delete --contract myAlias --transfer-id 0.0.5678
hcli contract delete --contract 0.0.123456 --state-only
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
- `api.keyResolver` - Key resolution for admin key
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandResult` interface:

```typescript
interface CommandResult {
  result: object;
}
```

**Output schemas:**

- **Create**: `contractId`, `contractName`, `contractEvmAddress`, `alias`, `network`, `transactionId`, `adminPublicKey`
- **Import**: `contractId`, `contractName`, `contractEvmAddress`, `alias`, `network`, `memo`, `verified`
- **List**: `contracts` (array with `contractId`, `contractName`, `contractEvmAddress`, `alias`, `adminPublicKey`, `network`), `totalCount`
- **Delete**: `deletedContract`, `network`, optional `removedAliases`, `transactionId`, `stateOnly`

Human-readable output uses Handlebars templates with HashScan links for contract and transaction IDs.

## 📊 State Management

Contract data is stored in the `contract-contracts` namespace with the following structure:

```typescript
interface ContractData {
  contractId: string; // Hedera contract ID (0.0.xxxxx)
  alias?: string; // Local alias for `--contract` lookups (optional)
  contractName?: string; // Human-readable name (e.g. from Solidity or import)
  contractEvmAddress: string; // Deployed contract EVM address
  adminPublicKey?: string; // Optional admin public key (from network / create)
  adminKeyRefId?: string; // KMS key ref for admin when set at create (for signing delete on network)
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
