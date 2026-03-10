#!/usr/bin/env bash

# Batch Operations Plugin Demo
#
# This script demonstrates the full batch plugin workflow on testnet:
#   1. Configure operator
#   2. Create 3 demo accounts
#   3. Batch transfer HBAR to all 3 from a CSV
#   4. Create a fungible token
#   5. Batch airdrop tokens to all 3 from a CSV (auto-handles association!)
#   6. Show final balances
#
# Prerequisites:
#   - HEDERA_OPERATOR_ACCOUNT_ID and HEDERA_OPERATOR_KEY set in environment
#   - npm run build (if running locally)
#
# Usage:
#   ./examples/scripts/batch-operations-demo.sh
#   HIERO_SCRIPT_CLI_MODE=global ./examples/scripts/batch-operations-demo.sh

set -euo pipefail

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TMP_DIR="$(mktemp -d)"

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

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
  print_step "CLI mode: global (using globally installed hcli)"
else
  print_step "CLI mode: local (project directory: ${PROJECT_DIR})"
fi
print_info "Operator account ID: ${HEDERA_OPERATOR_ACCOUNT_ID}"

# ============================================================
# Step 1: Configure network and operator
# ============================================================
print_step "Selecting Hedera testnet"
if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
  run_hcli network use --network testnet
else
  run_hcli network use --global testnet
fi

print_step "Configuring CLI operator"
run_hcli network set-operator \
  --operator "${HEDERA_OPERATOR_ACCOUNT_ID}:${HEDERA_OPERATOR_KEY}" \
  --network testnet

# ============================================================
# Step 2: Create 3 demo accounts
# ============================================================
ACCT1="$(pick_random_name)"
ACCT2="$(pick_random_name)"
ACCT3="$(pick_random_name)"

# Ensure unique names
while [[ "$ACCT2" == "$ACCT1" ]]; do ACCT2="$(pick_random_name)"; done
while [[ "$ACCT3" == "$ACCT1" || "$ACCT3" == "$ACCT2" ]]; do ACCT3="$(pick_random_name)"; done

print_step "Creating 3 demo accounts: $ACCT1, $ACCT2, $ACCT3"

run_hcli account create --name "$ACCT1" --balance 1 --auto-associations 10
run_hcli account create --name "$ACCT2" --balance 1 --auto-associations 10
run_hcli account create --name "$ACCT3" --balance 1 --auto-associations 10

print_step "Accounts created. Listing all:"
run_hcli account list

# ============================================================
# Step 3: Batch HBAR transfers from CSV
# ============================================================
CSV_HBAR="$TMP_DIR/hbar-transfers.csv"
cat > "$CSV_HBAR" <<EOF
to,amount,memo
${ACCT1},2,batch-demo-payment
${ACCT2},1.5,batch-demo-payment
${ACCT3},0.75,batch-demo-bonus
EOF

print_step "CSV file for HBAR transfers:"
cat "$CSV_HBAR"

print_step "Dry-run: validating HBAR transfer CSV"
run_hcli batch transfer-hbar --file "$CSV_HBAR" --dry-run

print_step "Executing batch HBAR transfers"
run_hcli batch transfer-hbar --file "$CSV_HBAR"

# ============================================================
# Step 4: Create a fungible token
# ============================================================
TOKEN_NAME="BatchDemo-$(date +%s)"
TOKEN_SYMBOL="BDEMO"

print_step "Creating fungible token: $TOKEN_NAME ($TOKEN_SYMBOL)"
run_hcli token create-ft \
  --token-name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --decimals 2 \
  --initial-supply 1000000 \
  --name "batch-demo-token"

# ============================================================
# Step 5: Batch airdrop tokens from CSV
# ============================================================
CSV_AIRDROP="$TMP_DIR/airdrop.csv"
cat > "$CSV_AIRDROP" <<EOF
to,amount
${ACCT1},5000
${ACCT2},2500
${ACCT3},1000
EOF

print_step "CSV file for token airdrop:"
cat "$CSV_AIRDROP"

print_step "Dry-run: validating airdrop CSV"
run_hcli batch airdrop --file "$CSV_AIRDROP" --token batch-demo-token --dry-run

print_step "Executing batch airdrop (auto-handles token association!)"
run_hcli batch airdrop --file "$CSV_AIRDROP" --token batch-demo-token

# ============================================================
# Step 6: Show final balances
# ============================================================
print_step "Final HBAR balances:"
for ACCT in "$ACCT1" "$ACCT2" "$ACCT3"; do
  print_info "Balance for $ACCT:"
  run_hcli account balance --account "$ACCT" --hbar-only
done

print_step "Demo complete!"
print_info "Demonstrated: account creation, batch HBAR transfers, token creation, and batch airdrop with auto-association."
print_info "All from CSV files — no manual per-recipient commands needed."
