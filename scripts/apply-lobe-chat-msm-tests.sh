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

if ! command -v rsync >/dev/null 2>&1; then
  echo "error: rsync is required but not found on PATH" >&2
  exit 1
fi

echo "Applying msm tests from $TESTS_DIR -> $LOBE_CHAT_DIR"
# Exclude scaffolding-only files so empty overlays do not litter the target tree.
rsync -a --exclude '.gitkeep' "$TESTS_DIR/" "$LOBE_CHAT_DIR/"

mapfile -t COPIED < <(
  find "$TESTS_DIR" \( -name '*.msm.test.ts' -o -name '*.msm.test.tsx' \) -type f | sort
)

if [[ ${#COPIED[@]} -eq 0 ]]; then
  echo "Copied msm test files: none"
else
  echo "Copied msm test files:"
  for src in "${COPIED[@]}"; do
    rel="${src#"$TESTS_DIR"/}"
    echo "  $rel"
  done
fi
