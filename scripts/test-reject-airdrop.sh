#!/usr/bin/env bash
# Manual test flow for `token reject-airdrop`
#
# Usage:
#   TREASURY=nowe1 RECEIVER=nowe2 bash scripts/test-reject-airdrop.sh

TREASURY="${TREASURY:-nowe1}"
RECEIVER="${RECEIVER:-nowe2}"
CLI="node $(dirname "$0")/../dist/hiero-cli.js --network testnet --confirm"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▶ $*${NC}"; }
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; exit 1; }

run() {
  echo "  $ $*" >&2
  if ! output=$("$@" 2>&1); then
    echo -e "${RED}ERROR:${NC} $output" >&2
    exit 1
  fi
  echo "$output"
}

run_expect_fail() {
  echo "  $ $*" >&2
  output=$("$@" 2>&1) && { echo "UNEXPECTED SUCCESS" >&2; exit 1; } || true
  echo "$output"
}

# ─── FT FLOW ────────────────────────────────────────────────────────────────

step "1. Create fungible token (treasury=$TREASURY)"
FT_OUTPUT=$(run $CLI token create-ft \
  --token-name "RejectTest FT" \
  -Y "RTF" \
  --decimals 2 \
  --initial-supply 1000 \
  --treasury "$TREASURY" \
  --format json)

FT_ID=$(echo "$FT_OUTPUT" | jq -r '.tokenId')
[ -z "$FT_ID" ] && fail "Could not parse tokenId from output"
ok "FT created: $FT_ID"

step "2. Associate FT with receiver ($RECEIVER)"
run $CLI token associate \
  --token "$FT_ID" \
  --account "$RECEIVER"
ok "Associated"

step "3. Transfer 100 RTF to receiver"
run $CLI token transfer-ft \
  --token "$FT_ID" \
  --from "$TREASURY" \
  --to "$RECEIVER" \
  --amount 100
ok "Transferred 100 RTF → $RECEIVER"

step "4. Reject FT from receiver → returns to treasury"
run $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$FT_ID"
ok "FT rejected successfully"

# ─── NFT FLOW ───────────────────────────────────────────────────────────────

step "5. Create NFT collection (treasury=$TREASURY)"
NFT_OUTPUT=$(run $CLI token create-nft \
  --token-name "RejectTest NFT" \
  -Y "RTNFT" \
  --treasury "$TREASURY" \
  --supply-key "$TREASURY" \
  --format json)

NFT_ID=$(echo "$NFT_OUTPUT" | jq -r '.tokenId')
[ -z "$NFT_ID" ] && fail "Could not parse tokenId from output"
ok "NFT collection created: $NFT_ID"

echo "  Waiting for mirror node propagation..." >&2
sleep 5

step "6. Mint 2 NFTs"
run $CLI token mint-nft --token "$NFT_ID" --supply-key "$TREASURY" --metadata "ipfs://test1"
run $CLI token mint-nft --token "$NFT_ID" --supply-key "$TREASURY" --metadata "ipfs://test2"
ok "Minted serials #1, #2"

step "7. Associate NFT with receiver"
run $CLI token associate \
  --token "$NFT_ID" \
  --account "$RECEIVER"
ok "Associated"

step "8. Transfer NFT serials #1 and #2 to receiver"
run $CLI token transfer-nft \
  --token "$NFT_ID" \
  --from "$TREASURY" \
  --to "$RECEIVER" \
  --serials 1,2
ok "Transferred serials #1, #2 → $RECEIVER"

step "9. Reject NFT serial #1"
run $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$NFT_ID" \
  --serial 1
ok "Serial #1 rejected"

step "10. Reject NFT serial #2"
run $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$NFT_ID" \
  --serial 2
ok "Serial #2 rejected"

# ─── ERROR CASES ────────────────────────────────────────────────────────────

step "11. [Expected error] NFT without --serial"
OUTPUT=$(run_expect_fail $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$NFT_ID")
echo "$OUTPUT" | grep -q "serial is required" \
  && ok "Got expected: --serial is required for NFT tokens" \
  || fail "Wrong error: $OUTPUT"

step "12. [Expected error] FT with --serial"
OUTPUT=$(run_expect_fail $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$FT_ID" \
  --serial 1)
echo "$OUTPUT" | grep -q "not applicable for fungible" \
  && ok "Got expected: --serial is not applicable for fungible tokens" \
  || fail "Wrong error: $OUTPUT"

step "13. [Expected error] More than 10 serials"
OUTPUT=$(run_expect_fail $CLI token reject-airdrop \
  --account "$RECEIVER" \
  --token "$NFT_ID" \
  --serial "1,2,3,4,5,6,7,8,9,10,11")
echo "$OUTPUT" | grep -qiE "error|invalid|too many|maximum|too big" \
  && ok "Got expected: max serials exceeded" \
  || fail "Wrong error: $OUTPUT"

echo -e "\n${GREEN}══════════════════════════════════"
echo "  All tests passed!"
echo "  FT token:  $FT_ID"
echo -e "  NFT token: $NFT_ID${NC}"
