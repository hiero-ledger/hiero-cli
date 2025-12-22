#!/usr/bin/env bash

# Simple Plugin Demo Script
# This script configures the CLI operator, creates two demo accounts
# with different HBAR balances, transfers HBAR between them, and shows
# their final HBAR-only balances.

set -euo pipefail

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# --- Helper for readable output ---
print_step() {
  echo
  echo "[STEP] $1"
}

print_info() {
  echo "[INFO] $1"
}

print_warn() {
  echo "[WARN] $1" >&2
}

sleep_loop() {
  local iterations=$1
  for ((i=1; i<=iterations; i++)); do
    sleep 1
    print_info "Waiting..."
  done
}

# --- Generate two random demo account names ---
FIRST_NAMES=("Jackie" "Theresa" "Mike" "Robert" "Bobby" "Pete" "Natalie" "Ebra")
LAST_NAMES=("Johnson" "Smith" "Brown" "Taylor" "Wilson" "Clark" "Evans" "Lewis")

pick_random_name() {
  local first_index=$((RANDOM % ${#FIRST_NAMES[@]}))
  local last_index=$((RANDOM % ${#LAST_NAMES[@]}))
  echo "${FIRST_NAMES[$first_index]}-${LAST_NAMES[$last_index]}" | tr '[:upper:]' '[:lower:]'
}

# --- Pre-flight checks for dependencies and build ---
if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
  print_warn "Project dependencies are not installed. Running: npm install"
  npm run install
fi

if [[ ! -f "${PROJECT_DIR}/dist/hedera-cli.js" ]]; then
  print_warn "Built CLI not found at dist/hedera-cli.js. Running: npm run build"
  npm run build
fi

# --- hcli wrapper (uses built JS CLI with JSON output to avoid interactive prompts) ---
hcli() {
  cd "${PROJECT_DIR}" && node dist/hedera-cli.js --format json "$@"
}

# --- Check required environment variables for operator ---
: "${HEDERA_OPERATOR_ACCOUNT_ID:?HEDERA_OPERATOR_ACCOUNT_ID environment variable is required (e.g. 0.0.xxxxxx)}"
: "${HEDERA_OPERATOR_KEY:?HEDERA_OPERATOR_KEY environment variable is required (private key for the operator account)}"

print_step "Using project directory: ${PROJECT_DIR}"
print_info "Operator account ID: ${HEDERA_OPERATOR_ACCOUNT_ID} (from environment)"

# --- Configure network and operator ---
print_step "Selecting Hedera testnet as the active network"
hcli network use --network testnet

print_step "Configuring CLI operator for testnet"
hcli network set-operator \
  --operator "${HEDERA_OPERATOR_ACCOUNT_ID}:${HEDERA_OPERATOR_KEY}" \
  --network testnet

ACCOUNTS=()
ACCOUNTS_NUMBER=3
print_step "Creating ${ACCOUNTS_NUMBER} accounts"
for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  print_step "Creating account (1 HBAR)"
  ACCOUNTS+=("$(pick_random_name)")
  hcli account create \
    --name "${ACCOUNTS[$((i - 1))]}" \
    --balance 1.0
done;
print_step "Done."

print_step "Creating public topic for token creation and transfer information"
TOPIC_NAME="public-topic"
hcli topic create --name $TOPIC_NAME

sleep_loop 3


TOKENS=()
print_step "Creating tokens for each account"
for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  account="${ACCOUNTS[$((i - 1))]}"
  print_step "Creating token for account $account"
  token_name="$account-token"
  hedera_token_name="$account TOKEN"
  TOKENS+=("$token_name")
  hcli token create \
    -n "$token_name" \
    -N "$hedera_token_name" \
    -s "TT" \
    -t "$account" \
    -i 300 \
    -a "$account"
  hcli topic submit-message --topic $TOPIC_NAME --message "Created token for an account with alias $account"
done;
print_step "Done."

print_step "Make transfer and publish message on topic"
for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  account_from="${ACCOUNTS[$((i - 1))]}"
  token_name="${TOKENS[$((i - 1))]}"
  for ((j=1; j<=ACCOUNTS_NUMBER; j++)); do
    if [ "$i" -eq "$j" ]; then
      # i and j are the same, skip this iteration
      continue
    else
      # i and j are different, do something
      account_to="${ACCOUNTS[$((j - 1))]}"
      print_step "Creating association with token $token_name for account $account_to"
      hcli token associate \
        -T "$token_name" \
        -a "$account_to"
      print_step "Transfer token $token_name from account $account_from to account $account_to"
      hcli token transfer \
        -T "$token_name" \
        -f "$account_from" \
        -t "$account_to" \
        -a 100
      hcli topic submit-message --topic $TOPIC_NAME --message "Transfer token $token_name from $account_from to $account_to"
    fi
  done;
done;
print_step "Done."

print_step "Print token balances of the accounts"

for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  account="${ACCOUNTS[$((i - 1))]}"
  print_step "Print balance of account $account"
  hcli account balance -a ${account}
done;

print_step "Demo complete. You have configured the operator, created 3 accounts,\n created token for each of the account and public topic to send information about it.\n Then the association and transfer of tokens between accounts was done and message sent to the topic confirming operation."