# batch plugin

Create and execute batches of Hedera transactions atomically. Commands that support batching expose a `--batch <name>` flag (marked **[batchify]** in other plugin references) to queue transactions without immediate execution.

## Workflow

1. `batch create` — create a named batch with a signing key
2. Add transactions using batchify-compatible commands with `--batch <name>`
3. `batch execute` — sign and submit all queued transactions
4. `batch delete` — cleanup if needed

---

### `hcli batch create`

Create a new named batch with a signing key.

| Option          | Short | Type   | Required | Default        | Description                                                                                                     |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `--name`        | `-n`  | string | **yes**  | —              | Name/alias for the batch                                                                                        |
| `--key`         | `-k`  | string | **yes**  | —              | Signing key: `accountId:privateKey`, `{ed25519\|ecdsa}:private:{hex}`, key reference `kr_xxx`, or account alias |
| `--key-manager` | `-m`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                       |

**Example:**

```
hcli batch create --name mintBatch --key 0.0.12345:302e...
```

**Output:** `{ batchName, keyRef }`

---

### `hcli batch execute`

Execute a batch — sign and submit all queued transactions.

| Option   | Short | Type   | Required | Description                  |
| -------- | ----- | ------ | -------- | ---------------------------- |
| `--name` | `-n`  | string | **yes**  | Name of the batch to execute |

**Example:**

```
hcli batch execute --name mintBatch
```

**Output:** `{ batchName, transactionsExecuted, transactionIds[] }`

---

### `hcli batch list`

List all available batches. No options.

**Example:**

```
hcli batch list
```

**Output:** Array of `{ batchName, transactionCount, status }`

---

### `hcli batch delete`

Delete an entire batch or a single transaction from a batch.

| Option    | Short | Type   | Required | Description                                                                         |
| --------- | ----- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `--name`  | `-n`  | string | **yes**  | Name of the batch                                                                   |
| `--order` | `-o`  | number | no       | Order index of a single transaction to remove. If omitted, deletes the entire batch |

**Example:**

```
# Delete entire batch
hcli batch delete --name mintBatch

# Remove 2nd transaction only
hcli batch delete --name mintBatch --order 2
```

**Output:** `{ batchName, deleted, order? }`

---

## Adding transactions to a batch

Use the `--batch <name>` flag on any batchify-compatible command:

```
# Queue a token mint (does NOT execute immediately)
hcli token mint-ft --token MTK --amount 1000 --supply-key 0.0.123:302e... --batch mintBatch

# Queue an FT transfer
hcli token transfer-ft --token MTK --to alice --amount 50 --batch mintBatch

# Then execute all at once
hcli batch execute --name mintBatch
```

Batchify-compatible commands (check each plugin reference for `[batchify]` marker):

- `account create`
- `hbar transfer`
- `token create-ft`, `token create-nft`, `token create-ft-from-file`, `token create-nft-from-file`
- `token mint-ft`, `token mint-nft`
- `token transfer-ft`, `token transfer-nft`
- `token associate`
- `topic create`, `topic submit-message`
