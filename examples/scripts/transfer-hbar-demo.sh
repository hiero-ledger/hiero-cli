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

print_error() {
  echo "[ERROR] $1" >&2
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

# --- Generate two random demo account names ---
FIRST_NAMES=("Alice" "Bob" "Charlie" "Diana" "Ethan" "Fiona" "George" "Hannah")
LAST_NAMES=("Johnson" "Smith" "Brown" "Taylor" "Wilson" "Clark" "Evans" "Lewis")

pick_random_name() {
  local first_index=$((RANDOM % ${#FIRST_NAMES[@]}))
  local last_index=$((RANDOM % ${#LAST_NAMES[@]}))
  echo "${FIRST_NAMES[$first_index]}-${LAST_NAMES[$last_index]}" | tr '[:upper:]' '[:lower:]'
}

ACCOUNT_HIGH_BALANCE_NAME="$(pick_random_name)"
ACCOUNT_LOW_BALANCE_NAME="$(pick_random_name)"

# Ensure the two names are different
if [[ "${ACCOUNT_HIGH_BALANCE_NAME}" == "${ACCOUNT_LOW_BALANCE_NAME}" ]]; then
  ACCOUNT_LOW_BALANCE_NAME="$(pick_random_name)"
fi

print_step "Creating two demo accounts"
print_info "High-balance account name: ${ACCOUNT_HIGH_BALANCE_NAME} (10 HBAR)"
print_info "Low-balance account name: ${ACCOUNT_LOW_BALANCE_NAME} (1 HBAR)"

# --- Create accounts with different starting balances ---
print_step "Creating high-balance account (10 HBAR)"
hcli account create \
  --name "${ACCOUNT_HIGH_BALANCE_NAME}" \
  --balance 10.0

print_step "Creating low-balance account (1 HBAR)"
hcli account create \
  --name "${ACCOUNT_LOW_BALANCE_NAME}" \
  --balance 1.0

# --- Show accounts stored in state ---
print_step "Listing all accounts stored in the CLI state"
hcli account list

# --- Transfer 2 HBAR from the high-balance account to the low-balance account ---
print_step "Transferring 2 HBAR from high-balance account to low-balance account"
# The sender is explicitly set to the high-balance account so the transfer does not use the operator as the payer.
hcli hbar transfer \
  --amount 2 \
  --from "${ACCOUNT_HIGH_BALANCE_NAME}" \
  --to "${ACCOUNT_LOW_BALANCE_NAME}"

# --- Show final HBAR-only balances for both accounts ---
print_step "Fetching final HBAR-only balances for both accounts"
print_info "Balance for high-balance account (${ACCOUNT_HIGH_BALANCE_NAME}):"
hcli account balance \
  --account "${ACCOUNT_HIGH_BALANCE_NAME}" \
  --hbar-only

print_info "Balance for low-balance account (${ACCOUNT_LOW_BALANCE_NAME}):"
hcli account balance \
  --account "${ACCOUNT_LOW_BALANCE_NAME}" \
  --hbar-only

print_step "Demo complete. You have configured the operator, created two accounts,\nlisted them in the CLI state, transferred 2 HBAR between them, and inspected their final HBAR balances."
