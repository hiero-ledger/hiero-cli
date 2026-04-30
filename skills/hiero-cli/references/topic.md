# topic plugin

Manage Hedera Consensus Service (HCS) topics: create, import, list, submit messages, find messages, delete.

---

### `hcli topic create` [batchify]

Create a new Hedera Consensus Service topic.

| Option          | Short | Type   | Required | Default        | Description                                                                                                                                                                  |
| --------------- | ----- | ------ | -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--memo`        | `-m`  | string | no       | —              | Topic memo                                                                                                                                                                   |
| `--admin-key`   | `-a`  | string | no       | —              | Admin key: `accountId:privateKey`, `{ed25519\|ecdsa}:private:{hex}`, key reference, or alias                                                                                 |
| `--submit-key`  | `-s`  | string | no       | —              | Submit key (restricts who can post). Formats: `accountId:privateKey`, account ID, `{ed25519\|ecdsa}:public:{hex}`, `{ed25519\|ecdsa}:private:{hex}`, key reference, or alias |
| `--name`        | `-n`  | string | no       | —              | Local alias for this topic                                                                                                                                                   |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                                                    |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                                                                                    |

**Example:**

```
hcli topic create --name myTopic --memo "My topic"
hcli topic create --name privateTopic --submit-key 0.0.123:302e...
hcli topic create --name myTopic --batch myBatch
```

**Output:** `{ topicId, name, transactionId }`

---

### `hcli topic import`

Import an existing topic into local state.

| Option    | Short | Type   | Required | Default | Description                            |
| --------- | ----- | ------ | -------- | ------- | -------------------------------------- |
| `--topic` | `-t`  | string | **yes**  | —       | Topic ID to import (e.g. `0.0.123456`) |
| `--name`  | `-n`  | string | no       | —       | Local alias for the topic              |

**Example:**

```
hcli topic import --topic 0.0.123456 --name importedTopic
```

**Output:** `{ topicId, name?, network, memo?, adminKeyPresent, submitKeyPresent }`

---

### `hcli topic list`

List all topics stored in local state. No options.

**Example:**

```
hcli topic list
```

**Output:** Array of `{ topicId, name, memo? }`

---

### `hcli topic submit-message` [batchify]

Submit a message to a Hedera Consensus Service topic.

| Option          | Short | Type   | Required | Default        | Description                                                                                                                                                                                                                                  |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--topic`       | `-t`  | string | **yes**  | —              | Topic ID or alias                                                                                                                                                                                                                            |
| `--message`     | `-m`  | string | **yes**  | —              | Message content to submit                                                                                                                                                                                                                    |
| `--signer`      | `-s`  | string | no       | —              | Key to sign with (required if topic has submit-key). For threshold topics (e.g. 2-of-3), pass `--signer` multiple times for each required signer. Formats: `accountId:privateKey`, `{ed25519\|ecdsa}:private:{hex}`, key reference, or alias |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                                                                                                                    |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                                                                                                                                                    |

**Example:**

```
hcli topic submit-message --topic myTopic --message "Hello, Hedera!"
hcli topic submit-message --topic privateTopic --message "Secret" --signer 0.0.123:302e...
hcli topic submit-message --topic myTopic --message "Hello" --batch myBatch
```

**Output:** `{ topicId, sequenceNumber, transactionId }`

---

### `hcli topic find-message`

Find messages in a topic by sequence number filters.

| Option           | Short | Type   | Required | Default | Description                              |
| ---------------- | ----- | ------ | -------- | ------- | ---------------------------------------- |
| `--topic`        | `-t`  | string | **yes**  | —       | Topic ID or alias                        |
| `--sequence-gt`  | `-g`  | number | no       | —       | Sequence number greater than             |
| `--sequence-gte` | `-G`  | number | no       | —       | Sequence number greater than or equal to |
| `--sequence-lt`  | `-l`  | number | no       | —       | Sequence number less than                |
| `--sequence-lte` | `-L`  | number | no       | —       | Sequence number less than or equal to    |
| `--sequence-eq`  | `-e`  | number | no       | —       | Sequence number equal to                 |

**Example:**

```
hcli topic find-message --topic myTopic --sequence-eq 1
hcli topic find-message --topic myTopic --sequence-gte 5 --sequence-lte 10
```

**Output:** Array of `{ sequenceNumber, message, consensusTimestamp }`

---

### `hcli topic update` [batchify]

Update an existing Hedera Consensus Service topic's properties on-chain.

| Option                   | Short | Type       | Required | Default        | Description                                                                        |
| ------------------------ | ----- | ---------- | -------- | -------------- | ---------------------------------------------------------------------------------- |
| `--topic`                | `-t`  | string     | **yes**  | —              | Topic ID or alias to update                                                        |
| `--memo`                 | `-m`  | string     | no       | —              | New topic memo. Set to `"null"` to clear                                           |
| `--admin-key`            | `-a`  | repeatable | no       | —              | New admin key(s). Cannot be cleared, only replaced. Same formats as `topic create` |
| `--admin-key-threshold`  | `-A`  | number     | no       | —              | M-of-N for threshold admin keys                                                    |
| `--submit-key`           | `-s`  | repeatable | no       | —              | New submit key(s). Set to `"null"` to clear                                        |
| `--submit-key-threshold` | `-S`  | number     | no       | —              | M-of-N for threshold submit keys                                                   |
| `--key-manager`          | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                          |
| `--auto-renew-account`   | `-r`  | string     | no       | —              | Auto-renew account ID or alias. Set to `"null"` to clear                           |
| `--auto-renew-period`    | `-p`  | number     | no       | —              | Auto-renew period in seconds (min 2592000/30d, max 8000000/~92d)                   |
| `--expiration-time`      | `-e`  | string     | no       | —              | Fixed expiration (ISO 8601)                                                        |
| `--batch`                | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                          |

**Example:**

```
hcli topic update --topic myTopic --memo "updated memo"
hcli topic update --topic 0.0.123456 --auto-renew-period 7776000
hcli topic update --topic privateTopic --submit-key alice --submit-key-threshold 1
hcli topic update --topic myTopic --memo "updated" --batch myBatch
```

**Output:** `{ topicId, name?, network, transactionId, updatedFields[], memo?, adminKeyPresent, submitKeyPresent, adminKeyThreshold, submitKeyThreshold, adminKeyCount?, submitKeyCount?, autoRenewAccount?, autoRenewPeriod?, expirationTime? }`

---

### `hcli topic delete` [batchify]

Delete a Hedera topic on the network and remove it from local state, or remove from local state only.

⚠️ Requires confirmation. Use `--confirm` to skip.

| Option          | Short | Type    | Required | Default | Description                                                                                                                                    |
| --------------- | ----- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--topic`       | `-t`  | string  | **yes**  | —       | Topic name or topic ID                                                                                                                         |
| `--state-only`  | `-s`  | boolean | no       | false   | Remove only from local CLI state (no `TopicDeleteTransaction` on Hedera)                                                                       |
| `--admin-key`   | `-a`  | string  | no       | —       | Admin key(s) when the topic is not in state, or to override keys from state (same formats as `topic create`; repeatable for KeyList/threshold) |
| `--key-manager` | `-k`  | string  | no       | config  | Key manager when resolving `--admin-key`                                                                                                       |
| `--batch`       | `-B`  | string  | no       | —       | Queue into a named batch instead of executing immediately                                                                                      |

**Example:**

```
hcli topic delete --topic myTopic --confirm
hcli topic delete --topic 0.0.123456 --state-only --confirm
hcli topic delete --topic importedTopic --admin-key alice --confirm
```

**Output:** `{ deletedTopic: { name?, topicId }, removedAliases?, network, transactionId?, stateOnly? }`
