#!/usr/bin/env bash
set -euo pipefail

# Installs the Solo CLI globally. Pinned to the same version CI uses so local and
# CI deploys stay reproducible. An already installed Solo is left alone when it
# matches the pin, upgraded when it is older, and only warned about when it is
# newer (so a locally built binary is never silently downgraded).
SOLO_VERSION="${SOLO_VERSION:-0.91.0}"

# Prints the running Solo version, or nothing when Solo is missing/broken.
# `--output=wide` yields the bare version number; older releases only print the
# banner, so the first dotted number is extracted either way.
installed_solo_version() {
  local raw
  raw="$(solo --version --output=wide 2>/dev/null || true)"
  grep -Eo '[0-9]+(\.[0-9]+)+' <<<"$raw" | head -n 1 || true
}

# Returns 0 when $1 sorts before $2. Missing components count as 0, so `0.91`
# and `0.91.0` compare as equal.
is_older_than() {
  local candidate_parts reference_parts index candidate reference
  IFS='.' read -r -a candidate_parts <<<"$1"
  IFS='.' read -r -a reference_parts <<<"$2"
  for ((index = 0; index < ${#reference_parts[@]}; index++)); do
    candidate="${candidate_parts[index]:-0}"
    reference="${reference_parts[index]:-0}"
    if ((10#$candidate < 10#$reference)); then
      return 0
    fi
    if ((10#$candidate > 10#$reference)); then
      return 1
    fi
  done
  return 1
}

# Returns 0 when both versions sort the same, e.g. `0.91` and `0.91.0`.
versions_are_equal() {
  ! is_older_than "$1" "$2" && ! is_older_than "$2" "$1"
}

if command -v solo >/dev/null 2>&1; then
  INSTALLED_VERSION="$(installed_solo_version)"
  if [[ -z "$INSTALLED_VERSION" ]]; then
    echo "Could not determine the installed Solo version - reinstalling @hiero-ledger/solo@${SOLO_VERSION}."
  elif is_older_than "$INSTALLED_VERSION" "$SOLO_VERSION"; then
    echo "Solo ${INSTALLED_VERSION} is older than the pinned ${SOLO_VERSION} - upgrading..."
  elif versions_are_equal "$INSTALLED_VERSION" "$SOLO_VERSION"; then
    echo "Solo ${INSTALLED_VERSION} already installed (pinned version) - skipping install."
    exit 0
  else
    echo "WARNING: Solo ${INSTALLED_VERSION} is newer than the pinned ${SOLO_VERSION} - leaving it in place." >&2
    echo "Set SOLO_VERSION=${INSTALLED_VERSION} to silence this warning." >&2
    exit 0
  fi
fi

echo "Installing @hiero-ledger/solo@${SOLO_VERSION} globally via npm..."
npm install -g "@hiero-ledger/solo@${SOLO_VERSION}"

FINAL_VERSION="$(installed_solo_version)"
echo "Solo installed: ${FINAL_VERSION:-unknown}"
