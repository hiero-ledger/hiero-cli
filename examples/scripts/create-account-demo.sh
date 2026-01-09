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

HELPERS="$SCRIPT_DIR/common/helpers.sh"

if [[ ! -f "$HELPERS" ]]; then
  echo "[ERROR] helpers.sh not found" >&2
  exit 1
fi

source "$HELPERS"

SETUP="$SCRIPT_DIR/common/helpers.sh"

if [[ ! -f "$SETUP" ]]; then
  echo "[ERROR] setup.sh not found" >&2
  exit 1
fi

source "$SETUP"

# --- hcli wrapper (uses built JS CLI with JSON output to avoid interactive prompts) ---
hcli() {
  cd "${PROJECT_DIR}" && node dist/hiero-cli.js --format json "$@"
}

print_step "Using project directory: ${PROJECT_DIR}"
print_info "Operator account ID: ${HEDERA_OPERATOR_ACCOUNT_ID} (from environment)"

# --- Configure network and operator ---
print_step "Selecting Hedera testnet as the active network"
hcli network use --global testnet

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