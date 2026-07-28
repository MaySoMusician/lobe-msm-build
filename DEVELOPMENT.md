# Actions

- https://github.com/actions/checkout/releases/tag/v6.0.2
- https://github.com/actions/setup-node/releases/tag/v6.4.0
- https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0
- https://github.com/actions/upload-artifact/releases/tag/v7.0.1
- https://github.com/pnpm/action-setup/releases/tag/v5.0.0
- https://github.com/actions/download-artifact/releases/tag/v8.0.1

# Local smoke (patch regression tests)

Prerequisite: a patched lobe-chat tree at `LOBE_CHAT_DIR` (e.g. the pin in `lobe-chat-main` plus `git am lobe-chat.patch`), with dependencies installed if you will run Vitest.

From this repo root:

```bash
cd /path/to/lobe-msm-build
export LOBE_CHAT_DIR=/path/to/lobe-chat   # optional if sibling ../lobe-chat

./scripts/apply-lobe-chat-msm-tests.sh
node scripts/verify-lobe-chat-patch-invariants.mjs
node scripts/run-lobe-chat-msm-tests.mjs
```

- Overlay copies `lobe-chat-tests/**/*.msm.test.ts(x)` into the lobe-chat tree; do not commit those files into the patch branch or regenerate them into `lobe-chat.patch`.
- Invariants need no install. The Vitest runner runs **only** `*.msm.test.ts(x)` — never full `bun run test` / unfiltered vitest.
