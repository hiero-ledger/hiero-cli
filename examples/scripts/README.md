# Hiero CLI demo scripts

This folder contains example configuration files and documentation for end-to-end demo scripts that show how to use the Hiero CLI (`hcli`) with Hedera accounts, HBAR and tokens.

Each script focuses on a simple, concrete scenario and prints clear, human-readable messages while it runs.

### CLI execution mode

Scripts can use either a **local** build (from the repo) or the **globally** installed `@hiero-ledger/hiero-cli` package. Control this with the `HIERO_SCRIPT_CLI_MODE` environment variable:

- **`local`** (default) – run the CLI from the repo: `node dist/hiero-cli.js` in the project directory. Requires `npm install` and `npm run build` in the project.
- **`global`** – run the globally installed `hcli` binary (e.g. after `npm install -g @hiero-ledger/hiero-cli`). No need to clone the repo or build.

Example:

```bash
# Use locally built CLI (default)
./examples/scripts/create-account-demo.sh

# Use globally installed CLI
HIERO_SCRIPT_CLI_MODE=global ./examples/scripts/create-account-demo.sh
```

**Note:** Scripts require Hedera operator credentials (see below). Without them you will see an error like `HEDERA_OPERATOR_ACCOUNT_ID environment variable is required`.

### Credentials (required)

Scripts need `HEDERA_OPERATOR_ACCOUNT_ID` and `HEDERA_OPERATOR_KEY`. You can provide them in either way:

1. **Using a `.env` file (recommended)**
   Create a file named `.env` in the **`examples/scripts/`** directory (same folder as `create-account-demo.sh`). Use `examples/scripts/.env.sample` as a template: copy it to `.env` and replace the placeholders with your Hedera testnet account ID and private key. The scripts load this file automatically.

   ```bash
   cp examples/scripts/.env.sample examples/scripts/.env
   # Edit examples/scripts/.env and set your HEDERA_OPERATOR_ACCOUNT_ID and HEDERA_OPERATOR_KEY
   ```

   You can also set `HIERO_SCRIPT_CLI_MODE=global` in that same `.env` file if you always want to use the globally installed CLI.

2. **Using exported variables**  
   In your terminal, run:
   - `export HEDERA_OPERATOR_ACCOUNT_ID=0.0.xxxxxx`
   - `export HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...`
     before running a script.

There are also helper scripts that are put inside directory `examples/scripts/common` which are:

- `helpers.sh` – shared helpers (e.g. message formatting, `run_hcli`)
- `setup.sh` – loads optional `.env`, checks dependencies/build for local mode, validates operator credentials

## 1. Create account demo (`examples/scripts/create-account-demo.sh`)

### What this script does

This the first and simplest script. Its job is to:

- Create a demo account with a balance of 1 HBAR
- View account details with `account view` command

### How to run this script

1. **Install prerequisites** (only once):
   - Install **Node.js 18 or newer** on your machine.
   - Clone this repository and install dependencies in the project folder:
     - `npm install`
   - Build the CLI so the compiled binary is available:
     - `npm run build`

2. **Prepare your Hedera operator credentials** (see [Credentials (required)](#credentials-required) above): either create `examples/scripts/.env` from `.env.sample` and fill in your values, or export `HEDERA_OPERATOR_ACCOUNT_ID` and `HEDERA_OPERATOR_KEY` in your terminal.

3. **Run the script** (from the project root):
   - Local CLI: `./examples/scripts/create-account-demo.sh`
   - Global CLI: `HIERO_SCRIPT_CLI_MODE=global ./examples/scripts/create-account-demo.sh`

## 2. Transfer HBAR demo (`examples/scripts/transfer-hbar-demo.sh`)

### What this script does

This script job is end-to-end example script that executes HBAR transfer between accounts. It shows how to:

- Configure the CLI operator for the Hedera **testnet** using your operator account ID and private key
- Create **two demo accounts** with random English names:
  - One account with a starting balance of **10 HBAR**
  - One account with a starting balance of **1 HBAR**
- Use the **HBAR transfer plugin** to transfer **2 HBAR** from the high-balance account to the low-balance account
- Check the **final HBAR-only balances** of both accounts so you can clearly see the effect of the transfer

This script represents simple story:

1. "Who is paying?" (the operator)
2. "Create two new wallets with different starting amounts"
3. "Send 2 HBAR from the richer wallet to the poorer one"
4. "Show the final money amounts in both wallets"

### How to run this script

1. **Install prerequisites** (only once): Node.js 18+, then for **local** mode: clone the repo, `npm install`, `npm run build`. For **global** mode: `npm install -g @hiero-ledger/hiero-cli` (see [CLI execution mode](#cli-execution-mode)).

2. **Prepare your Hedera operator credentials** (see [Credentials (required)](#credentials-required) above): either create `examples/scripts/.env` from `.env.sample` or export `HEDERA_OPERATOR_ACCOUNT_ID` and `HEDERA_OPERATOR_KEY`.

3. **Run the script** (from the project root):
   - Local CLI: `./examples/scripts/transfer-hbar-demo.sh`
   - Global CLI: `HIERO_SCRIPT_CLI_MODE=global ./examples/scripts/transfer-hbar-demo.sh`

## 3. Token and topics operations demo (`examples/scripts/token-topic-operations-demo.sh`)

### What this script does

The last script's job is to execute script that would perform token operations and record this information on the topic. Its job is two:

- Configure the CLI operator for the Hedera **testnet** using your operator account ID and private key
- Create **three demo accounts** with random English names:
- Create public topic for recording executed steps of token operations
- Create token for each of the account with treasury and admin key set to corresponding accout
- Record the token creation event on the topic
- Associate and transfer tokens between the accounts
- Record the transfer step on public topic
- Check account balance for each of the created account

### How to run this script

1. **Install prerequisites** (only once): Node.js 18+, then for **local** mode: clone the repo, `npm install`, `npm run build`. For **global** mode: `npm install -g @hiero-ledger/hiero-cli` (see [CLI execution mode](#cli-execution-mode)).

2. **Prepare your Hedera operator credentials** (see [Credentials (required)](#credentials-required) above): either create `examples/scripts/.env` from `.env.sample` or export `HEDERA_OPERATOR_ACCOUNT_ID` and `HEDERA_OPERATOR_KEY`.

3. **Run the script** (from the project root):
   - Local CLI: `./examples/scripts/token-topic-operations-demo.sh`
   - Global CLI: `HIERO_SCRIPT_CLI_MODE=global ./examples/scripts/token-topic-operations-demo.sh`
