#!/usr/bin/env bash

# Simple Plugin Demo Script
# This script configures the CLI operator, creates two demo accounts
# with different HBAR balances, transfers HBAR between them, and shows
# their final HBAR-only balances.

set -euo pipefail

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

HELPERS="$SCRIPT_DIR/common/helpers.sh"

if [[ ! -f "$HELPERS" ]]; then
  echo "[ERROR] helpers.sh not found" >&2
  exit 1
fi

source "$HELPERS"

SETUP="$SCRIPT_DIR/common/setup.sh"

if [[ ! -f "$SETUP" ]]; then
  echo "[ERROR] setup.sh not found" >&2
  exit 1
fi

source "$SETUP"

if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
  print_step "CLI mode: global (using globally installed hcli)"
else
  print_step "CLI mode: local (project directory: ${PROJECT_DIR})"
fi
print_info "Operator account ID: ${HEDERA_OPERATOR_ACCOUNT_ID} (from environment)"

# --- Configure network and operator ---
print_step "Selecting Hedera testnet as the active network"
# @TODO Remove this if-else block after next npm release; published package still uses --network, local build uses --global.
if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
  run_hcli network use --network testnet
else
  run_hcli network use --global testnet
fi

print_step "Configuring CLI operator for testnet"
run_hcli network set-operator \
  --operator "${HEDERA_OPERATOR_ACCOUNT_ID}:${HEDERA_OPERATOR_KEY}" \
  --network testnet

ACCOUNT_NAME="$(pick_random_name)"

print_step "Creating demo account"
print_info "Account name: ${ACCOUNT_NAME} (1 HBAR)"

# --- Create account ---
print_step "Creating demo account (1 HBAR)"
run_hcli account create \
  --name "${ACCOUNT_NAME}" \
  --balance 1.0

print_info "Waiting for Hedera Mirror Node for 5 seconds to update new account information...."
sleep_loop 5
print_info "Done"

print_step "View newly created account ${ACCOUNT_NAME}"
run_hcli account view \
  --account "${ACCOUNT_NAME}"



print_step "Demo complete. You have created account on testnet with balance of 1 HBAR and printed out the result with usage of view command"