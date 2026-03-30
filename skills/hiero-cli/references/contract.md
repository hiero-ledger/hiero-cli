# contract plugin

Manage smart contract lifecycle: compile Solidity, deploy to Hedera, import existing contracts, list, and delete from state.

---

### `hcli contract create`

Compile and deploy a smart contract. Accepts a Solidity file or a built-in template.

| Option                    | Short | Type       | Required | Default        | Description                                                                                                                               |
| ------------------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--name`                  | `-n`  | string     | **yes**  | —              | Alias for the contract in local state                                                                                                     |
| `--file`                  | `-f`  | string     | no       | —              | Path to Solidity file (absolute or relative). Mutually exclusive with `--default`                                                         |
| `--default`               | `-d`  | string     | no       | —              | Built-in template: `erc20` or `erc721`. Mutually exclusive with `--file`                                                                  |
| `--base-path`             | `-b`  | string     | no       | current dir    | Base directory for resolving Solidity imports                                                                                             |
| `--gas`                   | `-g`  | number     | no       | `2000000`      | Gas limit for contract creation                                                                                                           |
| `--admin-key`             | `-a`  | string     | no       | —              | Admin key: `accountId:privateKey`, `{ed25519\|ecdsa}:public:{hex}`, `{ed25519\|ecdsa}:private:{hex}`, account ID, alias, or key reference |
| `--memo`                  | `-m`  | string     | no       | —              | Contract memo                                                                                                                             |
| `--solidity-version`      | `-v`  | string     | no       | —              | Solidity compiler version                                                                                                                 |
| `--constructor-parameter` | `-c`  | repeatable | no       | —              | Constructor parameter(s). Repeat flag for multiple: `-c "arg1" -c "arg2"`                                                                 |
| `--key-manager`           | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                 |

**Example:**

```
# Deploy built-in ERC-20
hcli contract create --name myErc20 --default erc20 -c "TokenName" -c "TKN"

# Deploy custom Solidity file
hcli contract create --name myContract --file ./contracts/MyContract.sol --gas 3000000
```

**Output:** `{ contractId, evmAddress, name, transactionId }`

---

### `hcli contract list`

List all smart contracts stored in local state. No options.

**Example:**

```
hcli contract list
```

**Output:** Array of `{ contractId, evmAddress, name, verified? }`

---

### `hcli contract import`

Import an existing contract from the Hedera network by contract ID or EVM address.

| Option       | Short | Type    | Required | Default | Description                                                                                          |
| ------------ | ----- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `--contract` | `-c`  | string  | **yes**  | —       | Contract ID (`0.0.xxx`) or EVM address (`0x...`)                                                     |
| `--name`     | `-n`  | string  | no       | —       | Human-readable label stored in local state (used in listings and `--contract` lookups by name)       |
| `--alias`    | `-a`  | string  | no       | —       | Short identifier used as a lookup key in `--contract` (alternative to using the numeric contract ID) |
| `--verified` | `-v`  | boolean | no       | `false` | Whether the contract is verified on Hashscan                                                         |

**Example:**

```
hcli contract import --contract 0.0.123456 --name importedContract
hcli contract import --contract 0xAbCd1234... --alias myAlias
```

**Output:** `{ contractId, evmAddress, name, alias, verified }`

---

### `hcli contract delete`

**Default:** submits `ContractDeleteTransaction` on Hedera, then removes the contract from local CLI state. **With `--state-only`:** only removes it from local CLI state (no network transaction). Hedera does not allow deleting a contract on the network if it has no admin key; in that case use `--state-only` for local cleanup only. When the contract has an admin key, pass `--admin-key` (or keep a stored admin reference from `contract create --admin-key`) if signing material is not already in state.

⚠️ Requires confirmation unless using `--confirm` / script mode.

| Option                   | Short | Type       | Required | Default | Description                                                                                                               |
| ------------------------ | ----- | ---------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--contract`             | `-c`  | string     | **yes**  | —       | Contract ID (`0.0.xxx`) or alias; for network delete, state entry optional if mirror can resolve ID                       |
| `--state-only`           | `-s`  | boolean    | no       | `false` | Remove only from local CLI state; do not submit a network delete                                                          |
| `--transfer-id`          | `-t`  | string     | no†      | —       | Account receiving remaining HBAR (ID or alias). †One of `-t` or `-r` required for network delete. Not with `--state-only` |
| `--transfer-contract-id` | `-r`  | string     | no†      | —       | Contract receiving remaining HBAR. †One of `-t` or `-r` required for network delete. Not with `--state-only`              |
| `--admin-key`            | `-a`  | repeatable | no       | —       | Admin key if not stored in state (same as create). Not with `--state-only`                                                |
| `--key-manager`          | `-k`  | string     | no       | config  | Key manager when resolving `--admin-key`                                                                                  |

**Example:**

```
hcli contract delete --contract myErc20 --transfer-id 0.0.1234 --confirm
hcli contract delete --contract 0.0.123456 --state-only --confirm
```

**Output:** `{ deletedContract, network, removedAliases?, transactionId?, stateOnly? }`
