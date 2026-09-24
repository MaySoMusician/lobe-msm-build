#!/usr/bin/env bash
# Overlay msm regression tests from lobe-chat-tests/ onto a patched lobe-chat tree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MSM_BUILD_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TESTS_DIR="$MSM_BUILD_ROOT/lobe-chat-tests"
LOBE_CHAT_DIR="${LOBE_CHAT_DIR:-$MSM_BUILD_ROOT/../lobe-chat}"

if [[ ! -d "$TESTS_DIR" ]]; then
  echo "error: lobe-chat-tests directory missing: $TESTS_DIR" >&2
  exit 1
fi

if [[ ! -d "$LOBE_CHAT_DIR/.git" ]] && [[ ! -f "$LOBE_CHAT_DIR/.git" ]]; then
  # .git may be a file for worktrees; require either a dir or a gitdir file.
  if ! git -C "$LOBE_CHAT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    echo "error: LOBE_CHAT_DIR is not a git checkout: $LOBE_CHAT_DIR" >&2
    exit 1
  fi
fi

LOBE_CHAT_DIR="$(cd "$LOBE_CHAT_DIR" && pwd)"

echo "Applying msm tests from $TESTS_DIR -> $LOBE_CHAT_DIR"
# Remove stale overlays whose source path was renamed or deleted.
find "$LOBE_CHAT_DIR" \
  \( -name '*.msm.test.ts' -o -name '*.msm.test.tsx' \) \
  -type f -delete
# The Playwright package is intentionally standalone: copying it into the
# upstream e2e workspace would couple it to upstream package/layout changes.
mapfile -d '' -t COPIED < <(
  find "$TESTS_DIR" \
    -path "$TESTS_DIR/playwright" -prune -o \
    \( -name '*.msm.test.ts' -o -name '*.msm.test.tsx' \) -type f -print0 | sort -z
)

for src in "${COPIED[@]}"; do
  rel="${src#"$TESTS_DIR"/}"
  dest="$LOBE_CHAT_DIR/$rel"
  mkdir -p "$(dirname "$dest")"
  cp -p "$src" "$dest"
done

if [[ ${#COPIED[@]} -eq 0 ]]; then
  echo "Copied msm test files: none"
else
  echo "Copied msm test files:"
  for src in "${COPIED[@]}"; do
    rel="${src#"$TESTS_DIR"/}"
    echo "  $rel"
  done
fi
