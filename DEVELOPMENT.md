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

# Assembled behavior tests

The Playwright suite under `lobe-chat-tests/playwright` is standalone. It is
excluded from the source overlay and tests the assembled application through
browser and HTTP boundaries.

The application must contain the patched `@lobehub/ui`; using the registry
package does not exercise the MSM font/theme changes. The local runner builds
the checkout selected by `LOBE_UI_DIR` (default: sibling `../lobe-ui`),
packages it as `*-msm`, installs that tarball into a temporary Lobe Chat
worktree, builds an image, and leaves both source checkouts clean:

```bash
export LOBE_UI_DIR=/path/to/lobe-ui
export LOBE_CHAT_DIR=/path/to/lobe-chat
export MSM_INSTALL_BROWSER=1 # first run only

node scripts/run-lobe-chat-behavior-tests.mjs
```

The generated tarball and its source-SHA/checksum metadata are cached under
`.artifacts/`. Reuse a known package on later runs:

```bash
export LOBE_UI_TARBALL="$PWD/.artifacts/lobehub-ui.tgz"
node scripts/run-lobe-chat-behavior-tests.mjs --project=desktop
```

To test an image that is already loaded locally, set `LOBE_CHAT_IMAGE`. The
runner starts uniquely named temporary PostgreSQL and app containers and
removes only those containers. It defaults to app port `33210` and PostgreSQL
port `5433`; override them with `MSM_APP_PORT` / `MSM_POSTGRES_PORT`:

```bash
LOBE_CHAT_IMAGE=ghcr.io/example/lobe-chat:latest \
  node scripts/run-lobe-chat-behavior-tests.mjs
```

To target an already running app, provide its URL and either a database for
the test-user fixture or an existing Playwright storage state:

```bash
BASE_URL=http://localhost:3210 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
MSM_PROVIDER_INTEGRATION=0 \
  node scripts/run-lobe-chat-behavior-tests.mjs --project=desktop
```

Provider-boundary tests require the app to be configured with:

```text
OPENAI_API_KEY=msm-test-key
OPENAI_PROXY_URL=http://127.0.0.1:4010/v1
```

and `MSM_PROVIDER_INTEGRATION=1`. The suite starts the deterministic provider
on port 4010. UI chat tests intercept only browser chat requests and never call
an external model.

On failure, inspect:

- `lobe-chat-tests/playwright/playwright-report/`
- `lobe-chat-tests/playwright/test-results/`
- the application log uploaded by CI as `lobe-chat-behavior-failure`

Use static invariants only for build/supply-chain configuration with no
runtime seam. Use focused Vitest for low-level contracts that would require
unreasonable wall-clock time or cannot be observed externally. Prefer HTTP
tests for provider/server contracts and Playwright for user-visible behavior.
CI runs all layers and blocks image push/deploy on behavior-test failure.
