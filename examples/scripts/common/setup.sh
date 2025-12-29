# --- Pre-flight checks for dependencies and build ---
if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
  print_warn "Project dependencies are not installed. Running: npm install"
  npm run install
fi

if [[ ! -f "${PROJECT_DIR}/dist/hedera-cli.js" ]]; then
  print_warn "Built CLI not found at dist/hedera-cli.js. Running: npm run build"
  npm run build
fi

# --- Check required environment variables for operator ---
: "${HEDERA_OPERATOR_ACCOUNT_ID:?HEDERA_OPERATOR_ACCOUNT_ID environment variable is required (e.g. 0.0.xxxxxx)}"
: "${HEDERA_OPERATOR_KEY:?HEDERA_OPERATOR_KEY environment variable is required (private key for the operator account)}"