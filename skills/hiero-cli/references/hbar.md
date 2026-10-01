# hbar plugin

Transfer HBAR between Hedera accounts.

---

## `hcli hbar transfer` `[batchify]` `[scheduled]`

Transfer HBAR from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                                                                                                   |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount to transfer. Default: display units (HBAR). Append `"t"` for tinybars. Example: `"1"` = 1 HBAR, `"100t"` = 100 tinybar |
| `--to`          | `-t`  | string | **yes**  | —              | Recipient account ID, alias, or EVM address                                                                                   |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference `kr_xxx`, or account alias. Defaults to network operator                        |
| `--memo`        | `-m`  | string | no       | —              | Transaction memo                                                                                                              |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                                     |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                                     |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name (see `references/schedule.md`)                       |

**Example:**

```bash
hcli hbar transfer --amount 5 --to 0.0.67890
hcli hbar transfer --amount 1000t --to alice --from 0.0.12345:302e... --memo "payment"
hcli hbar transfer --amount 5 --to alice --batch myBatch
hcli hbar transfer --amount 5 --to alice --scheduled mySchedule
```

**Output:** `{ transactionId, fromAccountId, toAccountId, amountTinybar, network, memo?, status? }`

---

## `hcli hbar allowance` `[batchify]` `[scheduled]`

Approve a spender allowance for HBAR on behalf of the owner.

| Option          | Short | Type   | Required | Default        | Description                                                                           |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------- |
| `--amount`      | `-a`  | string | **yes**  | —              | Allowance amount. Default: HBAR display units. Append `"t"` for tinybars. Must be > 0 |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account: alias, account ID, or EVM address                                    |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Defaults to network operator                                           |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                             |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                             |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name              |

**Example:**

```bash
hcli hbar allowance --amount 10 --spender bob
hcli hbar allowance --amount 1000t --spender 0.0.67890 --owner alice
```

**Output:** `{ ownerAccountId, spenderAccountId, amountTinybar, transactionId, network }`

---

## `hcli hbar allowance-list`

List HBAR allowances granted by an owner account (Mirror Node data).

| Option       | Short | Type    | Required | Default | Description                                 |
| ------------ | ----- | ------- | -------- | ------- | ------------------------------------------- |
| `--account`  | `-a`  | string  | **yes**  | —       | Owner account ID or alias to query          |
| `--spender`  | `-s`  | string  | no       | —       | Optional spender account ID or alias filter |
| `--show-all` |       | boolean | no       | `false` | Fetch all pages instead of the first page   |

**Example:**

```bash
hcli hbar allowance-list --account alice
hcli hbar allowance-list --account 0.0.12345 --spender bob --show-all
```

**Output:** `{ accountId, network, allowances: [{ spenderAccountId, amountTinybar, amountDisplay }], total, hasMore }`

---

## `hcli hbar allowance-revoke` `[batchify]` `[scheduled]`

Revoke an existing HBAR spender allowance (sets allowance to zero).

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account: alias, account ID, or EVM address                       |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Defaults to network operator                              |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli hbar allowance-revoke --spender bob
hcli hbar allowance-revoke --spender 0.0.67890 --owner alice
```

**Output:** `{ ownerAccountId, spenderAccountId, amountTinybar, transactionId, network }`
