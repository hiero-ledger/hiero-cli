# schedule plugin

Manage Hedera scheduled transactions: create schedule records, sign, delete, and verify execution state.

## How scheduled transactions work

1. `schedule create` — register a named schedule in local state (no on-chain transaction yet)
2. Run any transaction-compatible command with `--scheduled <name>` (short: `-X`) — this wraps the command as a `ScheduleCreateTransaction` on Hedera and stores the on-chain schedule ID
3. `schedule sign` — add additional signatures to a pending scheduled transaction
4. `schedule verify` — check whether the scheduled transaction has been executed on-chain
5. `schedule delete` — delete the schedule from the network (requires admin key) and remove from local state

## State storage

Schedules are persisted in `~/.hiero-cli/state/schedule-transactions-storage.json`, keyed by `{network}:{name}`.

---

### `hcli schedule create`

Register a named schedule record in local state with signing parameters. This does not submit anything on-chain — the schedule is created on-chain when you pass `--scheduled <name>` to a transaction command.

| Option              | Short | Type    | Required | Default        | Description                                                                          |
| ------------------- | ----- | ------- | -------- | -------------- | ------------------------------------------------------------------------------------ |
| `--name`            | `-n`  | string  | **yes**  | —              | Name/alias for the schedule                                                          |
| `--admin-key`       | `-a`  | string  | no       | —              | Admin key for managing the scheduled transaction on Hedera                           |
| `--payer-account`   | `-p`  | string  | no       | operator       | Account that pays for the schedule. Accepts alias, `accountId:key`, or key reference |
| `--memo`            | `-m`  | string  | no       | —              | Public schedule memo (max 100 bytes)                                                 |
| `--expiration`      | `-e`  | string  | no       | —              | Expiration time (ISO 8601). Max 62 days from now                                     |
| `--wait-for-expiry` | `-w`  | boolean | no       | `false`        | Execute at expiration time instead of when all required signatures are collected     |
| `--key-manager`     | `-k`  | string  | no       | config default | Key manager: `local` or `local_encrypted`                                            |

**Example:**

```
hcli schedule create --name mySchedule
hcli schedule create --name mySchedule --admin-key alice --memo "scheduled mint" --expiration 2026-05-01T12:00:00Z
```

**Output:** `{ name, waitForExpiry, payerAccountId?, adminPublicKey?, expirationTime?, memo?, network }`

---

### `--scheduled` / `-X` hook

Pass `--scheduled <name>` (or `-X <name>`) to any transaction-compatible command to wrap it as a `ScheduleCreateTransaction` on Hedera instead of executing immediately.

```
# Instead of executing immediately, create a scheduled transaction on-chain
hcli token burn-ft --token MTK --amount 1000 --supply-key alice --scheduled mySchedule
hcli hbar transfer --amount 5 --to bob --scheduled mySchedule
hcli token mint-ft --token MTK --amount 500 --supply-key alice --scheduled mySchedule
```

The schedule record in local state is updated with the on-chain `scheduleId` and `transactionId`.

**Output (when --scheduled is used):** `{ scheduledName, scheduledId, network, transactionId }`

---

### `hcli schedule sign`

Add a signature to a pending scheduled transaction. Use when additional signers are required before the transaction can execute.

| Option          | Short | Type   | Required | Default        | Description                                     |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------- |
| `--schedule`    | `-s`  | string | **yes**  | —              | Schedule ID (`0.0.x`) or local schedule name    |
| `--key`         | `-k`  | string | **yes**  | —              | Key to sign with. Must resolve to a private key |
| `--key-manager` | `-K`  | string | no       | config default | Key manager: `local` or `local_encrypted`       |

**Example:**

```
hcli schedule sign --schedule mySchedule --key alice
hcli schedule sign --schedule 0.0.123456 --key 0.0.789:302e...
```

**Output:** `{ scheduleId, transactionId, network, name? }`

---

### `hcli schedule delete`

Delete a scheduled transaction from Hedera and remove it from local state. Admin key must be set.

| Option          | Short | Type   | Required | Default        | Description                                                                          |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------ |
| `--schedule`    | `-s`  | string | **yes**  | —              | Schedule ID (`0.0.x`) or local schedule name                                         |
| `--admin-key`   | `-a`  | string | no       | —              | Admin key to sign the delete. If omitted, uses the stored admin key from local state |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                            |

**Example:**

```
hcli schedule delete --schedule mySchedule
hcli schedule delete --schedule 0.0.123456 --admin-key alice
```

**Output:** `{ name, scheduleId?, transactionId?, network }`

---

### `hcli schedule verify`

Check whether a scheduled transaction has been executed on-chain, and optionally import an existing schedule into local state.

Requires at least one of `--name` or `--schedule-id`.

| Option          | Short | Type   | Required | Default        | Description                               |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------- |
| `--name`        | `-n`  | string | no\*     | —              | Local schedule name                       |
| `--schedule-id` | `-s`  | string | no\*     | —              | Schedule ID (`0.0.x`)                     |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted` |

\* At least one of `--name` or `--schedule-id` must be provided.

**Example:**

```
hcli schedule verify --name mySchedule
hcli schedule verify --schedule-id 0.0.123456
hcli schedule verify --name mySchedule --schedule-id 0.0.123456
```

**Output:** `{ scheduleId, network, name?, executedAt?, deleted, waitForExpiry, scheduleMemo?, expirationTime?, payerAccountId? }`
