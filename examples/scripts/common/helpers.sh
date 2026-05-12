# --- CLI execution mode (local = from repo build, global = installed via npm) ---
# Set HIERO_SCRIPT_CLI_MODE=global to use the globally installed hcli; default is local.
export HIERO_SCRIPT_CLI_MODE="${HIERO_SCRIPT_CLI_MODE:-local}"

run_hcli() {
  if [[ "${HIERO_SCRIPT_CLI_MODE}" == "global" ]]; then
    hcli --format json "$@"
  else
    (cd "${PROJECT_DIR}" && node dist/hiero-cli.js --format json "$@")
  fi
}

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
FIRST_NAMES=(
  "Jackie" "Theresa" "Mike" "Robert" "Bobby" "Pete" "Natalie" "Ebra"
  "Alex" "Jordan" "Casey" "Morgan" "Riley" "Avery" "Quinn" "Cameron"
  "Taylor" "Jamie" "Dakota" "Skyler" "Parker" "Sage" "River" "Phoenix"
  "Emma" "Olivia" "Sophia" "Isabella" "Charlotte" "Amelia" "Mia" "Harper"
  "Liam" "Noah" "Oliver" "William" "James" "Benjamin" "Lucas" "Henry"
  "Alexander" "Mason" "Michael" "Ethan" "Daniel" "Matthew" "Aiden" "Joseph"
  "David" "Jackson" "Logan" "Samuel" "Sebastian" "Aria" "Evelyn" "Abigail"
)
LAST_NAMES=(
  "Johnson" "Smith" "Brown" "Taylor" "Wilson" "Clark" "Evans" "Lewis"
  "Walker" "Hall" "Allen" "Young" "King" "Wright" "Lopez" "Hill"
  "Scott" "Green" "Adams" "Baker" "Nelson" "Carter" "Mitchell" "Perez"
  "Roberts" "Turner" "Phillips" "Campbell" "Parker" "Evans" "Edwards" "Collins"
  "Stewart" "Sanchez" "Morris" "Rogers" "Reed" "Cook" "Morgan" "Bell"
  "Murphy" "Bailey" "Rivera" "Cooper" "Richardson" "Cox" "Howard" "Ward"
  "Torres" "Peterson" "Gray" "Ramirez" "James" "Watson" "Brooks" "Kelly"
)

pick_random_name() {
  local first_index=$((RANDOM % ${#FIRST_NAMES[@]}))
  local last_index=$((RANDOM % ${#LAST_NAMES[@]}))
  echo "${FIRST_NAMES[$first_index]}-${LAST_NAMES[$last_index]}" | tr '[:upper:]' '[:lower:]'
}