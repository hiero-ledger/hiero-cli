# config plugin

Manage CLI configuration options: list all settings, get or set individual values.

## Available options

| Option                    | Type    | Default  | Allowed values                             | Description                                              |
| ------------------------- | ------- | -------- | ------------------------------------------ | -------------------------------------------------------- |
| `ed25519_support_enabled` | boolean | `false`  | `true`, `false`                            | Enable Ed25519 key support                               |
| `log_level`               | enum    | `silent` | `silent`, `error`, `warn`, `info`, `debug` | CLI logging verbosity                                    |
| `default_key_manager`     | enum    | `local`  | `local`, `local_encrypted`                 | Default key manager used when `--key-manager` is omitted |
| `skip_confirmations`      | boolean | `false`  | `true`, `false`                            | Skip all confirmation prompts globally                   |

---

### `hcli config list`

List all configuration options with their current values. No options.

**Example:**

```
hcli config list
```

**Output:** `{ totalCount, options: [{ name, type, value, allowedValues? }] }`

---

### `hcli config get`

Get the value of a single configuration option.

| Option     | Short | Type   | Required | Description         |
| ---------- | ----- | ------ | -------- | ------------------- |
| `--option` | `-o`  | string | **yes**  | Option name to read |

**Example:**

```
hcli config get --option default_key_manager
```

**Output:** `{ name, type, value, allowedValues? }`

---

### `hcli config set`

Set the value of a configuration option. Pass exactly one named option flag per invocation.

| Option                      | Type   | Required | Allowed values                             |
| --------------------------- | ------ | -------- | ------------------------------------------ |
| `--default_key_manager`     | string | one of   | `local`, `local_encrypted`                 |
| `--ed25519_support_enabled` | string | one of   | `true`, `false`                            |
| `--log_level`               | string | one of   | `silent`, `error`, `warn`, `info`, `debug` |
| `--skip_confirmations`      | string | one of   | `true`, `false`                            |

**Example:**

```
hcli config set --default_key_manager local_encrypted
hcli config set --skip_confirmations true
hcli config set --log_level debug
hcli config set --ed25519_support_enabled false
```

**Output:** `{ name, previousValue, newValue }`
