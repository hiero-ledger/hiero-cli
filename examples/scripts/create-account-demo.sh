#!/usr/bin/env bash

# Simple Plugin Demo Script
# This script configures the CLI operator, creates two demo accounts
# with different HBAR balances, transfers HBAR between them, and shows
# their final HBAR-only balances.

set -euo pipefail

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo $SCRIPT_DIR
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
echo $PROJECT_DIR

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

ACCOUNT_NAME="$(pick_random_name)"

print_step "Creating demo account"
print_info "Account name: ${ACCOUNT_NAME} (1 HBAR)"

# --- Create account ---
print_step "Creating demo account (1 HBAR)"
hcli account create \
  --name "${ACCOUNT_NAME}" \
  --balance 1.0

print_info "Waiting for Hedera Mirror Node for 5 seconds to update new account information...."
sleep_loop 5
print_info "Done"

print_step "View newly created account ${ACCOUNT_NAME}"
hcli account view \
  --account "${ACCOUNT_NAME}"



print_step "Demo complete. You have created account on testnet with balance of 1 HBAR and printed out the result with usage of view command"