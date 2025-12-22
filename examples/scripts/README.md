# Hiero CLI demo scripts

This folder contains example configuration files and documentation for end-to-end demo scripts that show how to use the Hiero CLI (`hcli`) with Hedera accounts, HBAR and tokens.

Each script focuses on a simple, concrete scenario and prints clear, human-readable messages while it runs.

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

2. **Prepare your Hedera operator credentials**:
   - You need a Hedera testnet account and its private key.
   - Export them as environment variables in your terminal (replace the placeholders with your real values):
     - `export HEDERA_OPERATOR_ACCOUNT_ID=0.0.xxxxxx`
     - `export HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...`

3. **Run the script**:
   - From the project root directory, run:
     - `./examples/scripts/create-account-demo.sh`

## 2. Trasfer hbar demo (`examples/scripts/transfer-hbar-demo.sh`)

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

1. **Install prerequisites** (only once):
   - Install **Node.js 18 or newer** on your machine.
   - Clone this repository and install dependencies in the project folder:
     - `npm install`
   - Build the CLI so the compiled binary is available:
     - `npm run build`

2. **Prepare your Hedera operator credentials**:
   - You need a Hedera testnet account and its private key.
   - Export them as environment variables in your terminal (replace the placeholders with your real values):
     - `export HEDERA_OPERATOR_ACCOUNT_ID=0.0.xxxxxx`
     - `export HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...`

3. **Run the script**:
   - From the project root directory, run:
     - `./examples/scripts/transfer-hbar-demo.sh`

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

1. **Install prerequisites** (only once):
   - Install **Node.js 18 or newer** on your machine.
   - Clone this repository and install dependencies in the project folder:
     - `npm install`
   - Build the CLI so the compiled binary is available:
     - `npm run build`

2. **Prepare your Hedera operator credentials**:
   - You need a Hedera testnet account and its private key.
   - Export them as environment variables in your terminal (replace the placeholders with your real values):
     - `export HEDERA_OPERATOR_ACCOUNT_ID=0.0.xxxxxx`
     - `export HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...`

3. **Run the script**:
   - From the project root directory, run:
     - `./examples/scripts/token-topic-operations-demo.sh`
