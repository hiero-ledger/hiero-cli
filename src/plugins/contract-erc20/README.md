# Contract ERC-20 Plugin

ERC-20 token interface plugin for the Hiero CLI. Provides commands to call standard ERC-20 (EIP-20) smart contract functions on Hedera. Contracts must be deployed first using the [contract plugin](../contract/README.md).

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/contract-erc20/
├── manifest.ts              # Plugin manifest with command definitions
├── shared/
│   └── erc20-abi.ts        # ERC-20 ABI interface definition
├── commands/
│   ├── name/               # name() view function
│   ├── symbol/             # symbol() view function
│   ├── decimals/           # decimals() view function
│   ├── total-supply/       # totalSupply() view function
│   ├── balance-of/         # balanceOf(address) view function
│   ├── allowance/          # allowance(owner, spender) view function
│   ├── transfer/          # transfer(to, value) state-changing
│   ├── transfer-from/     # transferFrom(from, to, value) state-changing
│   └── approve/           # approve(spender, value) state-changing
├── __tests__/unit/         # Unit tests
└── index.ts               # Plugin exports
```

Each command folder contains: `handler.ts`, `input.ts`, `output.ts`, `index.ts`, and optionally `result.ts` for view functions.

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output. Contract and account references accept **alias**, **Hedera entity ID** (0.0.xxx), or **EVM address** (0x...).

### View Functions (read-only, no transaction)

| Command        | Description                           |
| -------------- | ------------------------------------- |
| `name`         | Token name                            |
| `symbol`       | Token symbol                          |
| `decimals`     | Token decimals                        |
| `total-supply` | Total token supply                    |
| `balance-of`   | Balance of an account                 |
| `allowance`    | Approved amount from owner to spender |

### State-Changing Functions (require transaction, signed by operator)

| Command         | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `transfer`      | Transfer tokens from operator to recipient                            |
| `transfer-from` | Transfer tokens from one account to another (requires prior approval) |
| `approve`       | Approve spender to transfer tokens on behalf of operator              |

### name

```bash
hcli contract-erc20 name --contract my-token
hcli contract-erc20 name -c 0.0.123456
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### symbol

```bash
hcli contract-erc20 symbol --contract my-token
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### decimals

```bash
hcli contract-erc20 decimals --contract my-token
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### total-supply

```bash
hcli contract-erc20 total-supply --contract my-token
```

| Option     | Short | Required | Description          |
| ---------- | ----- | -------- | -------------------- |
| `contract` | `c`   | Yes      | Contract alias or ID |

### balance-of

```bash
hcli contract-erc20 balance-of --contract my-token --account alice
hcli contract-erc20 balance-of -c 0x123... -a 0.0.123456
```

| Option     | Short | Required | Description                       |
| ---------- | ----- | -------- | --------------------------------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address |
| `account`  | `a`   | Yes      | Account alias, ID or EVM address  |

### allowance

```bash
hcli contract-erc20 allowance --contract my-token --owner alice --spender bob
```

| Option     | Short | Required | Description                              |
| ---------- | ----- | -------- | ---------------------------------------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address        |
| `owner`    | `o`   | Yes      | Owner account alias, ID or EVM address   |
| `spender`  | `s`   | Yes      | Spender account alias, ID or EVM address |

### transfer

Transfers tokens from the operator account to the recipient.

```bash
hcli contract-erc20 transfer --contract my-token --to bob --value 1000
hcli contract-erc20 transfer -c my-token -t 0x123... -v 500 -g 150000
```

| Option     | Short | Required | Description                        | Default |
| ---------- | ----- | -------- | ---------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address  | -       |
| `to`       | `t`   | Yes      | Recipient alias, ID or EVM address | -       |
| `value`    | `v`   | Yes      | Amount to transfer (integer)       | -       |
| `gas`      | `g`   | No       | Gas for function call              | 100000  |

### transfer-from

Transfers tokens from one account to another. Requires prior `approve` from the `from` account to the operator.

```bash
hcli contract-erc20 transfer-from --contract my-token --from alice --to bob --value 100
```

| Option     | Short | Required | Description                             | Default |
| ---------- | ----- | -------- | --------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address       | -       |
| `from`     | `f`   | Yes      | Source account alias, ID or EVM address | -       |
| `to`       | `t`   | Yes      | Recipient alias, ID or EVM address      | -       |
| `value`    | `v`   | Yes      | Amount to transfer (integer)            | -       |
| `gas`      | `g`   | No       | Gas for function call                   | 100000  |

### approve

Approves a spender to transfer tokens on behalf of the operator.

```bash
hcli contract-erc20 approve --contract my-token --spender bob --value 500
```

| Option     | Short | Required | Description                              | Default |
| ---------- | ----- | -------- | ---------------------------------------- | ------- |
| `contract` | `c`   | Yes      | Contract alias, ID or EVM address        | -       |
| `spender`  | `s`   | Yes      | Spender account alias, ID or EVM address | -       |
| `value`    | `v`   | Yes      | Approval amount (integer)                | -       |
| `gas`      | `g`   | No       | Gas for function call                    | 100000  |

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

- **Alias**: Registered name (e.g. `my-token`, `alice`) – resolved via alias service
- **Entity ID**: Hedera format (e.g. `0.0.123456`)
- **EVM address**: Hex format (e.g. `0x1234...`)

View functions resolve contracts synchronously. State-changing functions resolve contracts via Mirror Node for full contract info.

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm run test:unit -- src/plugins/contract-erc20/__tests__/unit
```
