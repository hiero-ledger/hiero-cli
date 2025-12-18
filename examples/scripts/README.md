# Hiero CLI demo scripts

This folder contains example configuration files and documentation for end-to-end demo scripts that show how to use the Hiero CLI (`hcli`) with Hedera accounts, HBAR and tokens.

Each script focuses on a simple, concrete scenario and prints clear, human-readable messages while it runs.

## 1. Simple plugin demo (`examples/scripts/simple-plugin-demo.sh`)

### What this script does

This is the first and simplest end-to-end example script. It shows how to:

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
     - `./examples/scripts/simple-plugin-demo.sh`

The script will automatically:

- Select the Hedera testnet as the active network
- Configure the CLI operator using your credentials
- Create two demo accounts
- Transfer 2 HBAR between them
- Print the final HBAR balances of both accounts in a clear, human-readable format.
