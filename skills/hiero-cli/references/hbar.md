# hbar plugin

Transfer HBAR between Hedera accounts.

---

### `hcli hbar transfer` [batchify]

Transfer HBAR from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                                                                                                   |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount to transfer. Default: display units (HBAR). Append `"t"` for tinybars. Example: `"1"` = 1 HBAR, `"100t"` = 100 tinybar |
| `--to`          | `-t`  | string | **yes**  | —              | Recipient account ID or alias                                                                                                 |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference `kr_xxx`, or account alias. Defaults to network operator                        |
| `--memo`        | `-m`  | string | no       | —              | Transaction memo                                                                                                              |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                                     |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                                     |

**Example:**

```
hcli hbar transfer --amount 5 --to 0.0.67890
hcli hbar transfer --amount 1000t --to alice --from 0.0.12345:302e... --memo "payment"
hcli hbar transfer --amount 5 --to alice --batch myBatch
```

**Output:** `{ transactionId, from, to, amount, memo? }`

---

### `hcli hbar allowance` [batchify]

Approve a spender allowance for HBAR on behalf of the owner.

| Option          | Short | Type   | Required | Default        | Description                                                                           |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------- |
| `--amount`      | `-a`  | string | **yes**  | —              | Allowance amount. Default: HBAR display units. Append `"t"` for tinybars. Must be > 0 |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account: alias, account ID, or EVM address                                    |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Defaults to network operator                                           |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                             |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                             |

**Example:**

```
hcli hbar allowance --amount 10 --spender bob
hcli hbar allowance --amount 1000t --spender 0.0.67890 --owner alice
```

**Output:** `{ ownerAccountId, spenderAccountId, amountTinybar, transactionId, network }`

---

### `hcli hbar allowance-revoke` [batchify]

Revoke an existing HBAR spender allowance (sets allowance to zero).

| Option          | Short | Type   | Required | Default        | Description                                               |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------- |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account: alias, account ID, or EVM address        |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Defaults to network operator               |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                 |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately |

**Example:**

```
hcli hbar allowance-revoke --spender bob
hcli hbar allowance-revoke --spender 0.0.67890 --owner alice
```

**Output:** `{ ownerAccountId, spenderAccountId, amountTinybar, transactionId, network }`
