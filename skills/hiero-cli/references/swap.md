# swap plugin

Build and execute multi-party asset exchanges in a single Hedera transaction. A swap is built step-by-step by adding HBAR, fungible token, and NFT transfers, then executed atomically — all transfers succeed or all fail.

## Workflow

1. `swap create` — create a named swap (local only, no network interaction)
2. `swap add-hbar` / `swap add-ft` / `swap add-nft` — add transfer steps (max 10 total)
3. `swap view` — review before executing
4. `swap execute` — sign with all required keys and submit in one transaction
5. `swap delete` — discard without executing if needed

---

### `hcli swap create`

Create a new named swap. No network interaction.

| Option   | Short | Type   | Required | Default | Description                               |
| -------- | ----- | ------ | -------- | ------- | ----------------------------------------- |
| `--name` | `-n`  | string | **yes**  | —       | Name for the swap                         |
| `--memo` | `-m`  | string | no       | —       | Optional memo attached to the transaction |

**Example:**

```
hcli swap create --name my-swap
hcli swap create --name my-swap --memo "Alice sends HBAR, Bob sends tokens"
```

**Output:** `{ name, memo?, transferCount, maxTransfers }`

---

### `hcli swap add-hbar`

Add an HBAR transfer step to an existing swap.

| Option          | Short | Type   | Required | Default        | Description                                                 |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------- |
| `--name`        | `-n`  | string | **yes**  | —              | Name of the swap                                            |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account (accountId or alias)                    |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount: `"10"` = 10 HBAR, `"1000t"` = 1000 tinybars         |
| `--from`        | `-f`  | string | no       | operator       | Source account: `accountId:privateKey`, alias, or accountId |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                   |

**Example:**

```
hcli swap add-hbar -n my-swap --to alice --amount 10
hcli swap add-hbar -n my-swap --from bob --to 0.0.123456 --amount 500t
```

**Output:** `{ swapName, from, to, amount, transferCount, maxTransfers }`

---

### `hcli swap add-ft`

Add a fungible token transfer step to an existing swap. Fetches token decimals from mirror node to convert display amount to base units.

| Option          | Short | Type   | Required | Default        | Description                                                 |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------- |
| `--name`        | `-n`  | string | **yes**  | —              | Name of the swap                                            |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account (accountId or alias)                    |
| `--token`       | `-T`  | string | **yes**  | —              | Fungible token identifier (token ID or alias)               |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount: `"10"` = 10 tokens, `"1000t"` = base units          |
| `--from`        | `-f`  | string | no       | operator       | Source account: `accountId:privateKey`, alias, or accountId |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                   |

**Example:**

```
hcli swap add-ft -n my-swap --to alice --token my-token --amount 100
hcli swap add-ft -n my-swap --from bob --to 0.0.123456 --token 0.0.8849743 --amount 50t
```

**Output:** `{ swapName, from, to, token, amount, transferCount, maxTransfers }`

---

### `hcli swap add-nft`

Add one or more NFT serial transfers to an existing swap. Each serial number counts as one entry towards the 10-entry limit.

| Option          | Short | Type   | Required | Default        | Description                                                 |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------- |
| `--name`        | `-n`  | string | **yes**  | —              | Name of the swap                                            |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account (accountId or alias)                    |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token identifier (token ID or alias)                    |
| `--serials`     | `-s`  | string | **yes**  | —              | Comma-separated serial numbers, e.g. `"1,2,3"`              |
| `--from`        | `-f`  | string | no       | operator       | Source account: `accountId:privateKey`, alias, or accountId |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                   |

**Example:**

```
hcli swap add-nft -n my-swap --to alice --token my-nft --serials 1,2,3
hcli swap add-nft -n my-swap --from bob --to 0.0.123456 --token 0.0.8849743 --serials 5
```

**Output:** `{ swapName, from, to, token, serials[], transferCount, maxTransfers }`

---

### `hcli swap execute`

Sign with all required keys and submit all transfers in a single transaction. The swap is automatically removed from state on success.

| Option   | Short | Type   | Required | Description                 |
| -------- | ----- | ------ | -------- | --------------------------- |
| `--name` | `-n`  | string | **yes**  | Name of the swap to execute |

**Example:**

```
hcli swap execute --name my-swap
```

**Output:** `{ transactionId, network, swapName, transferCount, transfers[] }`

---

### `hcli swap view`

Display full details and all transfers of a single swap.

| Option   | Short | Type   | Required | Description              |
| -------- | ----- | ------ | -------- | ------------------------ |
| `--name` | `-n`  | string | **yes**  | Name of the swap to view |

**Example:**

```
hcli swap view --name my-swap
```

**Output:** `{ name, memo?, transferCount, maxTransfers, transfers[] }`

Each transfer entry: `{ index, type, from, to, detail }`

---

### `hcli swap list`

Display a summary of all saved swaps. No options.

**Example:**

```
hcli swap list
```

**Output:** `{ totalCount, swaps[] }` — each swap: `{ name, memo?, transferCount, maxTransfers }`

---

### `hcli swap delete`

Remove a swap from state without executing it.

| Option   | Short | Type   | Required | Description                |
| -------- | ----- | ------ | -------- | -------------------------- |
| `--name` | `-n`  | string | **yes**  | Name of the swap to delete |

**Example:**

```
hcli swap delete --name my-swap
```

**Output:** `{ name }`

---

## Limits

- Maximum **10 transfer entries** per swap (Hedera `TransferTransaction` limit)
- Each NFT serial number counts as one entry
- All transfers are submitted in a single transaction — either all succeed or all fail
