# Contract ERC-721 Plugin

ERC-721 (NFT) token interface plugin for the Hiero CLI. Provides commands to call standard ERC-721 (EIP-721) smart contract functions on Hedera. Contracts must be deployed first using the [contract plugin](../contract/README.md).

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/contract-erc721/
├── manifest.ts              # Plugin manifest with command definitions
├── shared/
│   └── erc721-abi.ts       # ERC-721 ABI interface definition
├── commands/
│   ├── name/               # name() view function
│   ├── symbol/             # symbol() view function
│   ├── balance-of/         # balanceOf(address) view function
│   ├── owner-of/           # ownerOf(tokenId) view function
│   ├── get-approved/       # getApproved(tokenId) view function
│   ├── is-approved-for-all/  # isApprovedForAll(owner, operator) view function
│   ├── token-uri/          # tokenURI(tokenId) view function
│   ├── approve/            # approve(to, tokenId) state-changing
│   ├── set-approval-for-all/  # setApprovalForAll(operator, approved) state-changing
│   ├── transfer-from/      # transferFrom(from, to, tokenId) state-changing
│   ├── safe-transfer-from/ # safeTransferFrom(from, to, tokenId [, data]) state-changing
│   └── mint/               # mint(to, tokenId) state-changing (experimental)
├── __tests__/unit/         # Unit tests
└── index.ts               # Plugin exports
```

Each command folder contains: `handler.ts`, `input.ts`, `output.ts`, `index.ts`, and optionally `result.ts` for view functions.

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output. Contract and account references accept **alias**, **Hedera entity ID** (0.0.xxx), or **EVM address** (0x...).

### View Functions (read-only, no transaction)

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `name`                | Token collection name                               |
| `symbol`              | Token symbol                                        |
| `balance-of`          | NFT balance of an owner                             |
| `owner-of`            | Owner of a token by ID                              |
| `get-approved`        | Approved address for a token                        |
| `is-approved-for-all` | Whether operator is approved for all owner's tokens |
| `token-uri`           | Metadata URI for a token                            |

### State-Changing Functions (require transaction, signed by operator)

| Command                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `approve`              | Approve address to transfer a specific token            |
| `set-approval-for-all` | Approve or revoke operator for all tokens               |
| `transfer-from`        | Transfer token from one address to another              |
| `safe-transfer-from`   | Safe transfer with optional data payload                |
| `mint`                 | Mint new token (experimental, requires custom contract) |

### name

```bash
hcli contract-erc721 name --contract my-nft
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### symbol

```bash
hcli contract-erc721 symbol --contract my-nft
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### balance-of

```bash
hcli contract-erc721 balance-of --contract my-nft --owner alice
```

| Option     | Short | Required | Description                            |
| ---------- | ----- | -------- | -------------------------------------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address      |
| `owner`    | `o`   | Yes      | Owner account alias, ID or EVM address |

### owner-of

```bash
hcli contract-erc721 owner-of --contract my-nft --tokenId 1
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |
| `tokenId`  | `t`   | Yes      | Token ID (uint256)   |

### get-approved

```bash
hcli contract-erc721 get-approved --contract my-nft --tokenId 1
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |
| `tokenId`  | `t`   | Yes      | Token ID to query    |

### is-approved-for-all

```bash
hcli contract-erc721 is-approved-for-all --contract my-nft --owner alice --operator bob
```

| Option     | Short | Required | Description                               |
| ---------- | ----- | -------- | ----------------------------------------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address         |
| `owner`    | `o`   | Yes      | Owner account alias, ID or EVM address    |
| `operator` | `p`   | Yes      | Operator account alias, ID or EVM address |

### token-uri

```bash
hcli contract-erc721 token-uri --contract my-nft --tokenId 1
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |
| `tokenId`  | `t`   | Yes      | Token ID to query    |

### approve

Approves an address to transfer a specific token. Operator must be the token owner.

```bash
hcli contract-erc721 approve --contract my-nft --to bob --tokenId 1
```

| Option     | Short | Required | Description                                   | Default |
| ---------- | ----- | -------- | --------------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address             | -       |
| `to`       | `t`   | Yes      | Address to approve (alias, ID or EVM address) | -       |
| `tokenId`  | `T`   | Yes      | Token ID to approve                           | -       |
| `gas`      | `g`   | No       | Gas for function call                         | 100000  |

### set-approval-for-all

Approves or revokes an operator for all tokens owned by the caller.

```bash
hcli contract-erc721 set-approval-for-all --contract my-nft --operator bob --approved true
```

| Option     | Short | Required | Description                               | Default |
| ---------- | ----- | -------- | ----------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address         | -       |
| `operator` | `o`   | Yes      | Operator account alias, ID or EVM address | -       |
| `approved` | `a`   | Yes      | "true" or "false"                         | -       |
| `gas`      | `g`   | No       | Gas for function call                     | 100000  |

### transfer-from

Transfers a token from one address to another. Caller must be owner, approved, or approved for all.

```bash
hcli contract-erc721 transfer-from --contract my-nft --from alice --to bob --tokenId 1
```

| Option     | Short | Required | Description                              | Default |
| ---------- | ----- | -------- | ---------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address        | -       |
| `from`     | `f`   | Yes      | Current owner (alias, ID or EVM address) | -       |
| `to`       | `t`   | Yes      | Recipient (alias, ID or EVM address)     | -       |
| `tokenId`  | `T`   | Yes      | Token ID to transfer                     | -       |
| `gas`      | `g`   | No       | Gas for function call                    | 100000  |

### safe-transfer-from

Safe transfer with optional data. Reverts if recipient is a contract that does not implement the receiver interface.

```bash
hcli contract-erc721 safe-transfer-from --contract my-nft --from alice --to bob --tokenId 1
hcli contract-erc721 safe-transfer-from -c my-nft -f alice -t bob -i 1 -d 0x1234
```

| Option     | Short | Required | Description                                  | Default |
| ---------- | ----- | -------- | -------------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address            | -       |
| `from`     | `f`   | Yes      | Current owner (alias, ID or EVM address)     | -       |
| `to`       | `t`   | Yes      | Recipient (alias, ID or EVM address)         | -       |
| `tokenId`  | `i`   | Yes      | Token ID to transfer                         | -       |
| `data`     | `d`   | No       | Optional hex-encoded data for 4-arg overload | -       |
| `gas`      | `g`   | No       | Gas for function call                        | 100000  |

### mint

**⚠️ EXPERIMENTAL** – Calls custom `mint(address to, uint256 tokenId)`. Requires contract to implement this function (e.g. via OpenZeppelin `_mint`).

```bash
hcli contract-erc721 mint --contract my-nft --to alice --tokenId 1
```

| Option     | Short | Required | Description                                  | Default |
| ---------- | ----- | -------- | -------------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address            | -       |
| `to`       | `t`   | Yes      | Recipient address (alias, ID or EVM address) | -       |
| `tokenId`  | `T`   | Yes      | Token ID to mint                             | -       |
| `gas`      | `g`   | No       | Gas for function call                        | 100000  |

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.contract` - Contract execute transaction creation
- `api.contractQuery` - Read-only contract calls (view functions)
- `api.txExecution` - Transaction signing and execution
- `api.identityResolution` - Resolve alias, entity ID, or EVM address to contract/account info
- `api.network` - Current network
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface. View functions return query results; state-changing functions return `contractId`, `network`, and `transactionId`.

Human-readable output uses Handlebars templates with HashScan links for contract and transaction IDs.

## 🏷️ Identity Resolution

Contract and account parameters support flexible referencing:

- **Alias**: Registered name (e.g. `my-nft`, `alice`) – resolved via alias service
- **Entity ID**: Hedera format (e.g. `0.0.123456`)
- **EVM address**: Hex format (e.g. `0x1234...`)

View functions resolve contracts synchronously. State-changing functions resolve contracts via Mirror Node for full contract info.

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm run test:unit -- src/plugins/contract-erc721/__tests__/unit
```
