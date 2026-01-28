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

ACCOUNTS=()
ACCOUNTS_NUMBER=3
print_step "Creating ${ACCOUNTS_NUMBER} accounts"
for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  print_step "Creating account (1 HBAR)"
  ACCOUNTS+=("$(pick_random_name)")
  run_hcli account create \
    --name "${ACCOUNTS[$((i - 1))]}" \
    --balance 1.0
done;
print_step "Done."

print_step "Creating public topic for token creation and transfer information"
TOPIC_NAME="public-topic"
run_hcli topic create --name $TOPIC_NAME

sleep_loop 3


TOKENS=()
print_step "Creating tokens for each account"
for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  account="${ACCOUNTS[$((i - 1))]}"
  print_step "Creating token for account $account"
  token_name="$account-token"
  hedera_token_name="$account TOKEN"
  TOKENS+=("$token_name")
  # @TODO Use only token create-ft after next npm release; published package still has unified token create.
  if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
    run_hcli token create \
      -n "$token_name" \
      -N "$hedera_token_name" \
      -s "TT" \
      -t "$account" \
      -i 300 \
      -a "$account"
  else
    run_hcli token create-ft \
      -n "$token_name" \
      -N "$hedera_token_name" \
      -s "TT" \
      -t "$account" \
      -i 300 \
      -a "$account"
  fi
  run_hcli topic submit-message --topic $TOPIC_NAME --message "Created token for an account with alias $account"
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
      run_hcli token associate \
        -T "$token_name" \
        -a "$account_to"
      print_step "Transfer token $token_name from account $account_from to account $account_to"
      # @TODO Use only token transfer-ft after next npm release; published package still has unified token transfer.
      if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
        run_hcli token transfer \
          -T "$token_name" \
          -f "$account_from" \
          -t "$account_to" \
          -a 100
      else
        run_hcli token transfer-ft \
          -T "$token_name" \
          -f "$account_from" \
          -t "$account_to" \
          -a 100
      fi
      run_hcli topic submit-message --topic $TOPIC_NAME --message "Transfer token $token_name from $account_from to $account_to"
    fi
  done;
done;
print_step "Done."

print_step "Print token balances of the accounts"

for ((i=1; i<=ACCOUNTS_NUMBER; i++)); do
  account="${ACCOUNTS[$((i - 1))]}"
  print_step "Print balance of account $account"
  run_hcli account balance -a ${account}
done;

print_step "Demo complete. You have configured the operator, created 3 accounts, created token for each of the account and public topic to send information about it. Then the association and transfer of tokens between accounts was done and message sent to the topic confirming operation."