# account plugin

Manage Hedera accounts: create, import, view balances, list, and delete.

---

### `hcli account create` [batchify]

Create a new Hedera account with specified balance and settings.

| Option                | Short | Type   | Required | Default        | Description                                                                                               |
| --------------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `--balance`           | `-b`  | string | **yes**  | —              | Initial HBAR balance. Default: display units. Add `"t"` for base units.                                   |
| `--auto-associations` | `-a`  | number | no       | `0`            | Max number of automatic token associations allowed                                                        |
| `--name`              | `-n`  | string | no       | —              | Alias for the created account                                                                             |
| `--key-manager`       | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                 |
| `--key-type`          | `-t`  | string | no       | `ecdsa`        | Key type: `ecdsa` or `ed25519`. Mutually exclusive with `--key`                                           |
| `--key`               | `-K`  | string | no       | —              | Existing key (private/public key, key reference `kr_xxx`, or alias). Mutually exclusive with `--key-type` |
| `--batch`             | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                 |

**Example:**

```
hcli account create --balance 10 --name myAccount --key-type ecdsa
hcli account create --balance 10 --batch myBatch
```

**Output:** `{ accountId, publicKey, privateKey, keyRef, name, balance }`

---

### `hcli account balance`

Retrieve the balance for an account ID or alias.

| Option        | Short | Type    | Required | Default | Description                                                 |
| ------------- | ----- | ------- | -------- | ------- | ----------------------------------------------------------- |
| `--account`   | `-a`  | string  | **yes**  | —       | Account ID (e.g. `0.0.123`) or alias                        |
| `--hbar-only` | `-H`  | boolean | no       | `false` | Show only HBAR balance                                      |
| `--token`     | `-t`  | string  | no       | —       | Filter by token ID or token name                            |
| `--raw`       | `-r`  | boolean | no       | `false` | Display balances in raw units (tinybars / base token units) |

**Example:**

```
hcli account balance --account myAccount
hcli account balance --account 0.0.123456 --hbar-only
```

**Output:** `{ accountId, hbarBalance, tokenBalances[] }`

---

### `hcli account list`

List all accounts stored in the local address book.

| Option      | Short | Type    | Required | Default | Description                                 |
| ----------- | ----- | ------- | -------- | ------- | ------------------------------------------- |
| `--private` | `-p`  | boolean | no       | `false` | Include private key reference ID in listing |

**Example:**

```
hcli account list
hcli account list --private
```

**Output:** Array of `{ accountId, name, publicKey, keyRef? }`

---

### `hcli account import`

Import an existing Hedera account into local state.

| Option          | Short | Type   | Required | Default        | Description                                                                  |
| --------------- | ----- | ------ | -------- | -------------- | ---------------------------------------------------------------------------- |
| `--key`         | `-K`  | string | **yes**  | —              | Credentials in `accountId:privateKey` format (e.g. `"0.0.123456:abc123..."`) |
| `--name`        | `-n`  | string | no       | —              | Alias for the imported account                                               |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                    |

**Example:**

```
hcli account import --key "0.0.123456:302e020100300506..." --name alice
```

**Output:** `{ accountId, name, keyRef }`

---

### `hcli account view`

View detailed information about an account.

| Option      | Short | Type   | Required | Default | Description         |
| ----------- | ----- | ------ | -------- | ------- | ------------------- |
| `--account` | `-a`  | string | **yes**  | —       | Account ID or alias |

**Example:**

```
hcli account view --account alice
hcli account view --account 0.0.123456
```

**Output:** `{ accountId, name, balance, publicKey, keyType, autoAssociations, ... }`

---

### `hcli account delete`

Delete an account from local state (does not delete from network).

⚠️ Requires confirmation. Use `--confirm` to skip.

| Option      | Short | Type   | Required | Default | Description                   |
| ----------- | ----- | ------ | -------- | ------- | ----------------------------- |
| `--account` | `-a`  | string | **yes**  | —       | Account ID or alias to delete |

**Example:**

```
hcli account delete --account alice --confirm
```

**Output:** `{ accountId, deleted }`

---

### `hcli account clear`

Remove **all** accounts from the local address book.

⚠️ Requires confirmation. Use `--confirm` to skip. No options.

**Example:**

```
hcli account clear --confirm
```

**Output:** `{ cleared: true }`
