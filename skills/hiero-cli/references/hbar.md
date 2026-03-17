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
