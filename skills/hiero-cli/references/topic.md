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

**Output:** `{ topicId, name }`

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

| Option          | Short | Type   | Required | Default        | Description                                                                                                                            |
| --------------- | ----- | ------ | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--topic`       | `-t`  | string | **yes**  | —              | Topic ID or alias                                                                                                                      |
| `--message`     | `-m`  | string | **yes**  | —              | Message content to submit                                                                                                              |
| `--signer`      | `-s`  | string | no       | —              | Key to sign with (required if topic has submit-key): `accountId:privateKey`, `{ed25519\|ecdsa}:private:{hex}`, key reference, or alias |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                                              |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                                              |

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

### `hcli topic delete`

Delete a topic from local state.

⚠️ Requires confirmation. Use `--confirm` to skip.

| Option    | Short | Type   | Required | Default | Description                                 |
| --------- | ----- | ------ | -------- | ------- | ------------------------------------------- |
| `--topic` | `-t`  | string | **yes**  | —       | Topic name or topic ID to delete from state |

**Example:**

```
hcli topic delete --topic myTopic --confirm
```

**Output:** `{ topicId, deleted }`
