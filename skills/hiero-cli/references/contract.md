# contract plugin

Manage smart contract lifecycle: compile Solidity, deploy to Hedera, import existing contracts, update, list, and delete from state.

---

### `hcli contract create`

Compile and deploy a smart contract. Accepts a Solidity file or a built-in template.

| Option                               | Short | Type       | Required | Default        | Description                                                                                                                                                                      |
| ------------------------------------ | ----- | ---------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--name`                             | `-n`  | string     | **yes**  | —              | Local name for the contract in CLI state                                                                                                                                         |
| `--file`                             | `-f`  | string     | no       | —              | Path to Solidity file (absolute or relative). Mutually exclusive with `--default`                                                                                                |
| `--default`                          | `-d`  | string     | no       | —              | Built-in template: `erc20` or `erc721`. Mutually exclusive with `--file`                                                                                                         |
| `--base-path`                        | `-b`  | string     | no       | current dir    | Base directory for resolving Solidity imports                                                                                                                                    |
| `--gas`                              | `-g`  | number     | no       | `2000000`      | Gas limit for contract creation                                                                                                                                                  |
| `--admin-key`                        | `-a`  | repeatable | no       | —              | Admin key: `accountId:privateKey`, `{ed25519\|ecdsa}:public:{hex}`, `{ed25519\|ecdsa}:private:{hex}`, account ID, alias, or key reference. Pass multiple times for multiple keys |
| `--admin-key-threshold`              | `-A`  | number     | no       | —              | M-of-N: number of admin keys required to sign (only when multiple `--admin-key` values are set)                                                                                  |
| `--memo`                             | `-m`  | string     | no       | —              | Contract memo                                                                                                                                                                    |
| `--solidity-version`                 | `-v`  | string     | no       | —              | Solidity compiler version                                                                                                                                                        |
| `--constructor-parameter`            | `-c`  | repeatable | no       | —              | Constructor parameter(s). Repeat flag for multiple: `-c "arg1" -c "arg2"`                                                                                                        |
| `--initial-balance`                  | `-i`  | string     | no       | —              | Initial HBAR balance for the contract. Format: `"100"` (HBAR) or `"100t"` (tinybars)                                                                                             |
| `--auto-renew-period`                | `-r`  | string     | no       | —              | Auto-renew period: seconds as integer, or with suffix `s`/`m`/`h`/`d` (e.g. `500`, `500s`, `50m`, `2h`, `30d`)                                                                   |
| `--auto-renew-account-id`            | `-R`  | string     | no       | —              | Account ID (`0.0.xxx`) that pays for auto-renewal of the contract                                                                                                                |
| `--max-automatic-token-associations` | `-t`  | number     | no       | —              | Maximum number of automatic token associations (`-1` for unlimited, `0` to disable)                                                                                              |
| `--staked-account-id`                | `-s`  | string     | no       | —              | Account ID (`0.0.xxx`) to stake this contract to (mutually exclusive with `--staked-node-id`)                                                                                    |
| `--staked-node-id`                   | `-o`  | number     | no       | —              | Node ID to stake this contract to (mutually exclusive with `--staked-account-id`)                                                                                                |
| `--decline-staking-reward`           | `-D`  | flag       | no       | `false`        | Decline staking rewards for this contract                                                                                                                                        |
| `--key-manager`                      | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                                                        |

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

**Output:** Array of `{ contractId, evmAddress, name }`

---

### `hcli contract import`

Import an existing contract from the Hedera network by contract ID or EVM address.

| Option       | Short | Type   | Required | Default | Description                                                                   |
| ------------ | ----- | ------ | -------- | ------- | ----------------------------------------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —       | Contract ID (`0.0.xxx`) or EVM address (`0x...`)                              |
| `--name`     | `-n`  | string | no       | —       | Optional local name (stored in state and registered for `--contract` lookups) |

**Example:**

```
hcli contract import --contract 0.0.123456 --name myContract
hcli contract import --contract 0xAbCd1234... --name myAlias
```

**Output:** `{ contractId, evmAddress, name, ... }`

---

### `hcli contract update`

Update smart contract properties on the Hedera network. The CLI loads the contract's admin key from the mirror node to determine signing requirements and auto-discovers matching KMS keys. At least one updatable field must be provided. After a successful update, local state is synced; if the admin key changes, all registered aliases have their key reference updated.

| Option                               | Short | Type       | Required | Default | Description                                                                                                                    |
| ------------------------------------ | ----- | ---------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `--contract`                         | `-c`  | string     | **yes**  | —       | Contract ID (`0.0.xxx`), alias, or EVM address                                                                                 |
| `--admin-key`                        | `-K`  | repeatable | no       | —       | Current admin credential(s) used to sign the update. Omit to use KMS auto-discovery                                            |
| `--new-admin-key`                    | `-a`  | repeatable | no       | —       | Replacement admin key(s). The new key's private key must also exist in KMS so it can co-sign the update                        |
| `--new-admin-key-threshold`          | `-A`  | number     | no       | —       | M-of-N: number of new admin keys required to sign. Only valid when multiple `--new-admin-key` values are given                 |
| `--memo`                             | `-m`  | string     | no       | —       | Contract memo (max 100 chars). Pass `"null"` or `""` to clear                                                                  |
| `--auto-renew-period`                | `-r`  | string     | no       | —       | Auto-renew period: plain integer = seconds, or suffix `s`/`m`/`h`/`d` (e.g. `500`, `50m`, `2h`, `30d`)                        |
| `--auto-renew-account-id`            | `-R`  | string     | no       | —       | Account ID (`0.0.xxx`) whose balance pays for auto-renewal. Pass `"null"` to clear                                             |
| `--max-automatic-token-associations` | `-t`  | number     | no       | —       | Maximum automatic token associations. `-1` for unlimited, `0` to disable                                                       |
| `--staked-account-id`                | `-s`  | string     | no       | —       | Account ID (`0.0.xxx`) to stake this contract to. Mutually exclusive with `--staked-node-id`                                   |
| `--staked-node-id`                   | `-o`  | number     | no       | —       | Node ID to stake this contract to. Mutually exclusive with `--staked-account-id`                                               |
| `--decline-staking-reward`           | `-D`  | boolean    | no       | —       | Whether to decline staking rewards for this contract                                                                           |
| `--expiration-time`                  | `-e`  | string     | no       | —       | Expiration time as ISO datetime string (e.g. `2026-12-31T00:00:00Z`)                                                           |
| `--key-manager`                      | `-k`  | string     | no       | config  | Key manager: `local` or `local_encrypted`                                                                                      |

**Example:**

```
# Update memo
hcli contract update --contract my-contract --memo "new description"

# Clear memo
hcli contract update --contract 0.0.123456 --memo ""

# Replace admin key
hcli contract update --contract my-contract --new-admin-key ed25519:public:<hex>

# Replace admin key with M-of-N policy (2-of-3)
hcli contract update --contract my-contract \
  --new-admin-key alice --new-admin-key bob --new-admin-key carol \
  --new-admin-key-threshold 2

# Update staking and auto-renew settings
hcli contract update --contract my-contract \
  --staked-node-id 3 --auto-renew-period 90d --auto-renew-account-id 0.0.500
```

**Output:** `{ contractId, network, transactionId, updatedFields }`

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
