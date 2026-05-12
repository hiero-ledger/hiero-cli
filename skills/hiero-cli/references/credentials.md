# credentials plugin

Manage stored credentials (keys) in the KMS: list all key references, remove specific credentials.

Key references (format: `kr_xxx`) are identifiers for keys stored in the local key manager. They can be used in place of inline `accountId:privateKey` pairs in any command that accepts keys.

---

### `hcli credentials list`

Show all stored credentials and their key reference IDs. No options.

**Example:**

```
hcli credentials list
```

**Output:** Array of `{ keyRefId, accountId?, keyType, keyManager }`

---

### `hcli credentials remove`

Remove credentials by key reference ID from KMS storage.

⚠️ Requires confirmation. Use `--confirm` to skip.

| Option | Short | Type   | Required | Description                                   |
| ------ | ----- | ------ | -------- | --------------------------------------------- |
| `--id` | `-i`  | string | **yes**  | Key reference ID to remove (e.g. `kr_abc123`) |

**Example:**

```
hcli credentials remove --id kr_abc123 --confirm
```

**Output:** `{ keyRefId, removed: true }`
