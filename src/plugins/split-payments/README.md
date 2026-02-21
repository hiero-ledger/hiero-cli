# Split Payments Plugin

Batch HBAR transfers from a single CSV file so you don’t have to run `hbar transfer` many times.

## What it does

- Reads a CSV with **recipient** and **amount** (one transfer per row).
- Uses your configured **operator** (or `--from`) as the payer for all transfers.
- Runs each transfer one after another and reports success/failure per row.
- Optional **dry run** to validate the file and list planned transfers without sending.

## Command

```bash
hcli split-payments transfer --file <path-to-csv>
```

### Options

| Option          | Short | Required | Description                                                |
| --------------- | ----- | -------- | ---------------------------------------------------------- |
| `--file`        | `-f`  | Yes      | Path to CSV file (see format below).                       |
| `--from`        | `-F`  | No       | Payer: alias or `accountId:privateKey`. Default: operator. |
| `--key-manager` | `-k`  | No       | `local` or `local_encrypted`. Default: config.             |
| `--dry-run`     | —     | No       | Validate and list planned transfers only; no transactions. |

### CSV format

- **Columns:** `to`, `amount` (order matters).
- **Separator:** comma (`,`) or semicolon (`;`).
- **Header (optional):** first line can be `to,amount` or `address,amount`; it’s skipped.
- **Amount:** HBAR (e.g. `10`, `1.5`) or **tinybars** with a trailing `t` (e.g. `100t` = 100 tinybars; `500t` = 500 tinybars). Without `t`, the value is in HBAR (1 HBAR = 100,000,000 tinybars).
- **To:** Hedera account ID (`0.0.123`), EVM address, or CLI account alias.

**Where to put the file:** You can put the CSV anywhere. Pass the path with `--file` (absolute or relative to your current working directory). Examples:

- Project root: `hcli split-payments transfer --file payments.csv` (from repo root)
- Full path: `hcli split-payments transfer --file C:\Users\you\payments.csv`
- Subfolder: `hcli split-payments transfer --file data/payments.csv`

Example `payments.csv`:

```csv
to,amount
0.0.100,1.5
0.0.101,2
alice,10
0.0.102,500t
```

## When to run what

1. **First-time / check setup**
   - Set network: `hcli network use -g testnet`
   - Set operator: `hcli network set-operator -o <your-account>`
   - Optional: `hcli config set -o default_key_manager -v local_encrypted`

2. **Validate CSV without sending**

   ```bash
   hcli split-payments transfer --file payments.csv --dry-run
   ```

3. **Run batch transfer**

   ```bash
   hcli split-payments transfer --file payments.csv
   ```

4. **Use another payer or network**
   ```bash
   hcli split-payments transfer --file payments.csv --from my-other-account
   hcli split-payments transfer --file payments.csv --network mainnet
   ```

## Output

- **Human (default):** Summary (total / success / failed) and per-row result with HashScan links for successful transfers.
- **JSON:** `--format json` for scriptable output with the same data.

## Requirements

- Operator (or `--from`) must have enough HBAR for all transfers and fees.
- Each transfer is a separate Hedera transaction (one per row).
- Failed rows are reported; successful rows are still committed.

## Troubleshooting

- **"unknown command 'split-payments'"**  
  Run the CLI from the **built** project, not a globally installed package:
  ```bash
  node dist/hiero-cli.js split-payments transfer --file payments.csv
  ```
  From the repo root after `npm run build`. If you had run the CLI before this plugin was added, the fix in the core plugin manager now merges new default plugins into existing state, so a fresh run should register `split-payments` automatically.
